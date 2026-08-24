import { getActiveUserId } from '@/lib/auth-state';
import { createSupabaseClient } from '@/lib/supabase-client';
import { BIBLE_BOOKS as PLAN_BOOKS, isChapterRead, type GoalStatus } from '@/lib/plan';
import { queuePersistedSlicesSave } from '@/services/persisted-state';
import type { SQLiteDatabase } from 'expo-sqlite';

const GRASS_TABLE = 'bible_grass';
const GRASS_META_ROW_DATE = '__meta__';

export type GrassDayEntry = {
  bookCode: string;
  readChapter: number[];
};

export type GrassDayValue = {
  date: string;
  data: GrassDayEntry[];
  fillYn: boolean;
};

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

function parseGrassValue(date: string, raw: unknown): GrassDayValue {
  if (Array.isArray(raw)) {
    return { date, data: raw as GrassDayEntry[], fillYn: false };
  }

  if (raw && typeof raw === 'object') {
    const value = raw as { date?: unknown; data?: unknown; fillYn?: unknown };
    return {
      date: typeof value.date === 'string' ? value.date : date,
      data: Array.isArray(value.data) ? (value.data as GrassDayEntry[]) : [],
      fillYn: value.fillYn === true,
    };
  }

  return { date, data: [], fillYn: false };
}

async function ensureLocalGrassTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${GRASS_TABLE} (
      date TEXT PRIMARY KEY,
      data TEXT NOT NULL DEFAULT '[]'
    );
  `);
}

function toSupabaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error('GRASS_REMOTE_ERROR');
}

async function loadRemoteGrassDay(
  userId: string,
  date: string,
): Promise<GrassDayValue | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from(GRASS_TABLE)
    .select('date, data')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw toSupabaseError(error);
  if (!data) return null;

  const row = data as { date?: unknown; data?: unknown };
  return parseGrassValue(String(row.date ?? date), row.data);
}

async function upsertRemoteGrassDay(
  userId: string,
  value: GrassDayValue,
): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from(GRASS_TABLE).upsert(
    {
      user_id: userId,
      date: value.date,
      data: {
        date: value.date,
        data: value.data,
        fillYn: value.fillYn,
      },
    },
    { onConflict: 'user_id,date' },
  );

  if (error) throw toSupabaseError(error);
}

export async function initGrassTable(db: SQLiteDatabase): Promise<void> {
  if (getActiveUserId()) return;
  await ensureLocalGrassTable(db);
}

export async function getGrassData(db: SQLiteDatabase): Promise<GrassDataMap> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(GRASS_TABLE)
      .select('date, data')
      .eq('user_id', userId);

    if (error) throw toSupabaseError(error);

    const map: GrassDataMap = {};
    for (const rawRow of data ?? []) {
      const row = rawRow as { date?: unknown; data?: unknown };
      const date = String(row.date ?? '');
      if (!date || date === GRASS_META_ROW_DATE) continue;
      map[date] = parseGrassValue(date, row.data);
    }
    return map;
  }

  await ensureLocalGrassTable(db);
  const rows = await db.getAllAsync<{ date: string; data: string }>(
    `SELECT date, data FROM ${GRASS_TABLE}`,
  );
  const map: GrassDataMap = {};
  for (const r of rows) {
    if (!r.date) continue;
    const parsed = parseJson<unknown>(r.data ?? '[]', []);
    map[r.date] = parseGrassValue(r.date, parsed);
  }
  return map;
}

export function getChapterCountForDate(data: GrassDataMap, date: string): number {
  const day = data[date];
  if (!day) return 0;
  return day.data.reduce((sum, e) => sum + e.readChapter.length, 0);
}

function toDateString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getStreakUpToYesterday(
  data: GrassDataMap,
  selectedYear: number,
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

export async function syncGrassForBook(
  db: SQLiteDatabase,
  date: string,
  bookCode: string,
  readChapters: number[],
): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    const current = (await loadRemoteGrassDay(userId, date)) ?? { date, data: [], fillYn: false };
    let dayData = current.data.filter((entry) => entry.bookCode !== bookCode);
    if (readChapters.length > 0) {
      dayData.push({ bookCode, readChapter: readChapters });
    }
    await upsertRemoteGrassDay(userId, {
      date,
      data: dayData,
      fillYn: dayData.length > 0 ? false : current.fillYn,
    });
    return;
  }

  await ensureLocalGrassTable(db);
  const rows = await db.getAllAsync<{ data: string }>(`SELECT data FROM ${GRASS_TABLE} WHERE date = ?`, date);
  const parsed = rows[0] ? parseJson<unknown>(rows[0].data ?? '[]', []) : [];
  const current = parseGrassValue(date, parsed);
  let dayData = current.data.filter((entry) => entry.bookCode !== bookCode);
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
    }),
  );
  await queuePersistedSlicesSave(db, ['grassData']);
}

export async function syncGrassFromPlanSave(
  db: SQLiteDatabase,
  bookCode: string,
  prevStatus: number[],
  newStatus: number[],
): Promise<void> {
  await applyGoalStatusDiffForBook(db, todayString(), bookCode, prevStatus, newStatus);
  if (!getActiveUserId()) {
    await queuePersistedSlicesSave(db, ['grassData']);
  }
}

async function applyGoalStatusDiffForBook(
  db: SQLiteDatabase,
  date: string,
  bookCode: string,
  prevStatus: number[],
  newStatus: number[],
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

  const userId = getActiveUserId();
  const current =
    userId
      ? (await loadRemoteGrassDay(userId, date)) ?? { date, data: [], fillYn: false }
      : await (async () => {
          await ensureLocalGrassTable(db);
          const rows = await db.getAllAsync<{ data: string }>(
            `SELECT data FROM ${GRASS_TABLE} WHERE date = ?`,
            date,
          );
          const parsed = rows[0] ? parseJson<unknown>(rows[0].data ?? '[]', []) : [];
          return parseGrassValue(date, parsed);
        })();

  const existingEntry = current.data.find((entry) => entry.bookCode === bookCode);
  const currentChapters = existingEntry?.readChapter ?? [];

  const prevSet = new Set(prevChapters);
  const newSet = new Set(newChapters);
  const removedChapters = prevChapters.filter((ch) => !newSet.has(ch));
  const addedChapters = newChapters.filter((ch) => !prevSet.has(ch));

  const resultChapters = [
    ...currentChapters.filter((ch) => !removedChapters.includes(ch)),
    ...addedChapters,
  ]
    .filter((ch, index, array) => array.indexOf(ch) === index)
    .sort((left, right) => left - right);

  const nextDayData = current.data.filter((entry) => entry.bookCode !== bookCode);
  if (resultChapters.length > 0) {
    nextDayData.push({ bookCode, readChapter: resultChapters });
  }

  const nextValue = {
    date,
    data: nextDayData,
    fillYn: nextDayData.length > 0 ? false : current.fillYn,
  };

  if (userId) {
    await upsertRemoteGrassDay(userId, nextValue);
    return;
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO ${GRASS_TABLE} (date, data) VALUES (?, ?)`,
    date,
    JSON.stringify(nextValue),
  );
}

export async function syncPlanGoalStatusToGrass(
  db: SQLiteDatabase,
  selectedBookCodes: string[],
  previousGoalStatus: GoalStatus,
  nextGoalStatus: GoalStatus,
  date = todayString(),
): Promise<void> {
  for (const bookCode of selectedBookCodes) {
    const bookIndex = PLAN_BOOKS.findIndex((book) => book.bookCode === bookCode);
    if (bookIndex < 0) continue;
    await applyGoalStatusDiffForBook(
      db,
      date,
      bookCode,
      previousGoalStatus[bookIndex] ?? [],
      nextGoalStatus[bookIndex] ?? [],
    );
  }
  if (!getActiveUserId()) {
    await queuePersistedSlicesSave(db, ['grassData']);
  }
}

export async function fillGrassByPoint(
  db: SQLiteDatabase,
  date: string,
): Promise<boolean> {
  const userId = getActiveUserId();
  if (userId) {
    const current = await loadRemoteGrassDay(userId, date);
    const currentData = current?.data ?? [];
    if (currentData.length > 0) return false;

    await upsertRemoteGrassDay(userId, {
      date,
      data: [],
      fillYn: true,
    });
    return true;
  }

  await ensureLocalGrassTable(db);
  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM ${GRASS_TABLE} WHERE date = ?`,
    date,
  );
  const parsed = rows[0] ? parseJson<unknown>(rows[0].data ?? '[]', []) : [];
  const currentValue = parseGrassValue(date, parsed);
  if (currentValue.data.length > 0) return false;

  await db.runAsync(
    `INSERT OR REPLACE INTO ${GRASS_TABLE} (date, data) VALUES (?, ?)`,
    date,
    JSON.stringify({
      date,
      data: [],
      fillYn: true,
    }),
  );
  await queuePersistedSlicesSave(db, ['grassData']);
  return true;
}
