import { BIBLE_BOOKS as PLAN_BOOKS, isChapterRead, type GoalStatus } from '@/lib/plan';
import { queuePersistedSlicesSave } from '@/lib/sqlite-supabase-store';
import type { SQLiteDatabase } from 'expo-sqlite';

const GRASS_TABLE = 'bible_grass';

export type GrassDayEntry = {
  bookCode: string;
  readChapter: number[];
};

export type GrassDayValue = {
  date: string;
  data: GrassDayEntry[];
  fillYn: boolean;
};

/** date string (YYYY-MM-DD) -> { date, data, fillYn } */
export type GrassDataMap = Record<string, GrassDayValue>;

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return (JSON.parse(raw || 'null') as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function initGrassTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${GRASS_TABLE} (
      date TEXT PRIMARY KEY,
      data TEXT NOT NULL DEFAULT '[]'
    );
  `);
}

export async function getGrassData(db: SQLiteDatabase): Promise<GrassDataMap> {
  const rows = await db.getAllAsync<{ date: string; data: string }>(
    `SELECT date, data FROM ${GRASS_TABLE}`
  );
  const map: GrassDataMap = {};
  for (const r of rows) {
    if (r.date) {
      const parsed = parseJson<unknown>(r.data ?? '[]', []);
      if (Array.isArray(parsed)) {
        map[r.date] = { date: r.date, data: parsed as GrassDayEntry[], fillYn: false };
      } else if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as { date?: unknown; data?: unknown; fillYn?: unknown };
        map[r.date] = {
          date: typeof obj.date === 'string' ? obj.date : r.date,
          data: Array.isArray(obj.data) ? (obj.data as GrassDayEntry[]) : [],
          fillYn: obj.fillYn === true,
        };
      } else {
        map[r.date] = { date: r.date, data: [], fillYn: false };
      }
    }
  }
  return map;
}

/** Get total chapter count for a specific date */
export function getChapterCountForDate(
  data: GrassDataMap,
  date: string
): number {
  const day = data[date];
  if (!day) return 0;
  return day.data.reduce((sum, e) => sum + e.readChapter.length, 0);
}

function toDateString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 어제까지 이어지는 연속 읽기 일수.
 * selectedYear 내에서만 계산.
 * includesYesterday: 어제 읽었는지 (연속 유지 중인지)
 */
export function getStreakUpToYesterday(
  data: GrassDataMap,
  selectedYear: number
): { streak: number; includesYesterday: boolean } {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateString(yesterday);

  if (yesterday.getFullYear() !== selectedYear) {
    return { streak: 0, includesYesterday: false };
  }

  if (getChapterCountForDate(data, yesterdayStr) === 0) {
    return { streak: 0, includesYesterday: false };
  }

  let streak = 1;
  let d = new Date(yesterday);
  d.setDate(d.getDate() - 1);

  while (d.getFullYear() === selectedYear && getChapterCountForDate(data, toDateString(d)) > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return { streak, includesYesterday: true };
}

/** Merge/replace book entry for a date. Used when syncing from plan save. */
export async function syncGrassForBook(
  db: SQLiteDatabase,
  date: string,
  bookCode: string,
  readChapters: number[]
): Promise<void> {
  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM ${GRASS_TABLE} WHERE date = ?`,
    date
  );

  const parsed = rows[0] ? parseJson<unknown>(rows[0].data ?? '[]', []) : [];
  const current =
    Array.isArray(parsed)
      ? { date, data: parsed as GrassDayEntry[], fillYn: false }
      : typeof parsed === 'object' && parsed !== null
        ? {
          date: typeof (parsed as { date?: unknown }).date === 'string'
            ? ((parsed as { date?: string }).date as string)
            : date,
          data: Array.isArray((parsed as { data?: unknown }).data)
            ? ((parsed as { data: GrassDayEntry[] }).data as GrassDayEntry[])
            : [],
          fillYn: (parsed as { fillYn?: unknown }).fillYn === true,
        }
        : { date, data: [], fillYn: false };
  let dayData: GrassDayEntry[] = current.data;

  dayData = dayData.filter((e) => e.bookCode !== bookCode);
  if (readChapters.length > 0) {
    dayData.push({ bookCode, readChapter: readChapters });
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO ${GRASS_TABLE} (date, data) VALUES (?, ?)`,
    date,
    JSON.stringify({
      date,
      data: dayData,
      fillYn: dayData.length > 0 ? false : current.fillYn,
    })
  );
  await queuePersistedSlicesSave(db, ['grassData']);
}

/**
 * Sync grass when user saves in ChapterEditDrawer.
 * 읽기표 goalStatus는 누적 진행 상태이므로, 오늘 잔디에는 "이번 저장에서 바뀐 장"만 반영한다:
 * - prev에 있다가 new에서 해제된 장 → 오늘 잔디에 있던 경우에만 제거
 * - prev에 없었다가 new에서 체크된 장 → 오늘 잔디에 추가
 * - 과거 날짜에 읽어서 이미 누적 상태에만 남아 있던 장은 오늘 잔디에 다시 기록하지 않음
 */
export async function syncGrassFromPlanSave(
  db: SQLiteDatabase,
  bookCode: string,
  prevStatus: number[],
  newStatus: number[]
): Promise<void> {
  await applyGoalStatusDiffForBook(db, todayString(), bookCode, prevStatus, newStatus);
  await queuePersistedSlicesSave(db, ['grassData']);
}

async function applyGoalStatusDiffForBook(
  db: SQLiteDatabase,
  date: string,
  bookCode: string,
  prevStatus: number[],
  newStatus: number[]
): Promise<void> {
  const prevChapters: number[] = [];
  const newChapters: number[] = [];
  for (let i = 0; i < Math.max(prevStatus.length, newStatus.length); i++) {
    const p = prevStatus[i] ?? 0;
    const n = newStatus[i] ?? 0;
    const ch = i + 1;
    if (isChapterRead(p)) prevChapters.push(ch);
    if (isChapterRead(n)) newChapters.push(ch);
  }

  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM ${GRASS_TABLE} WHERE date = ?`,
    date
  );

  const parsed = rows[0] ? parseJson<unknown>(rows[0].data ?? '[]', []) : [];
  const current =
    Array.isArray(parsed)
      ? { date, data: parsed as GrassDayEntry[], fillYn: false }
      : typeof parsed === 'object' && parsed !== null
        ? {
          date: typeof (parsed as { date?: unknown }).date === 'string'
            ? ((parsed as { date?: string }).date as string)
            : date,
          data: Array.isArray((parsed as { data?: unknown }).data)
            ? ((parsed as { data: GrassDayEntry[] }).data as GrassDayEntry[])
            : [],
          fillYn: (parsed as { fillYn?: unknown }).fillYn === true,
        }
        : { date, data: [], fillYn: false };
  let dayData: GrassDayEntry[] = current.data;

  const existingEntry = dayData.find((e) => e.bookCode === bookCode);
  const currentChapters = existingEntry?.readChapter ?? [];

  const prevSet = new Set(prevChapters);
  const newSet = new Set(newChapters);
  const removedChapters = prevChapters.filter((ch) => !newSet.has(ch));
  const addedChapters = newChapters.filter((ch) => !prevSet.has(ch));

  // 오늘 잔디는 누적 goalStatus 전체가 아니라 이번 저장에서 바뀐 장만 반영한다.
  const resultChapters = [
    ...currentChapters.filter((ch) => !removedChapters.includes(ch)),
    ...addedChapters,
  ]
    .filter((ch, i, arr) => arr.indexOf(ch) === i)
    .sort((a, b) => a - b);

  const nextDayData = dayData.filter((e) => e.bookCode !== bookCode);
  if (resultChapters.length > 0) {
    nextDayData.push({ bookCode, readChapter: resultChapters });
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO ${GRASS_TABLE} (date, data) VALUES (?, ?)`,
    date,
    JSON.stringify({
      date,
      data: nextDayData,
      fillYn: nextDayData.length > 0 ? false : current.fillYn,
    })
  );
}

export async function syncPlanGoalStatusToGrass(
  db: SQLiteDatabase,
  selectedBookCodes: string[],
  previousGoalStatus: GoalStatus,
  nextGoalStatus: GoalStatus,
  date = todayString()
): Promise<void> {
  for (const bookCode of selectedBookCodes) {
    const bookIndex = PLAN_BOOKS.findIndex((book) => book.bookCode === bookCode);
    if (bookIndex < 0) continue;
    await applyGoalStatusDiffForBook(
      db,
      date,
      bookCode,
      previousGoalStatus[bookIndex] ?? [],
      nextGoalStatus[bookIndex] ?? []
    );
  }
  await queuePersistedSlicesSave(db, ['grassData']);
}

export async function fillGrassByPoint(
  db: SQLiteDatabase,
  date: string
): Promise<boolean> {
  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM ${GRASS_TABLE} WHERE date = ?`,
    date
  );
  const parsed = rows[0] ? parseJson<unknown>(rows[0].data ?? '[]', []) : [];
  const currentData = Array.isArray(parsed)
    ? (parsed as GrassDayEntry[])
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { data?: unknown }).data)
      ? ((parsed as { data: GrassDayEntry[] }).data as GrassDayEntry[])
      : [];
  if (currentData.length > 0) return false;

  await db.runAsync(
    `INSERT OR REPLACE INTO ${GRASS_TABLE} (date, data) VALUES (?, ?)`,
    date,
    JSON.stringify({
      date,
      data: [],
      fillYn: true,
    })
  );
  await queuePersistedSlicesSave(db, ['grassData']);
  return true;
}
