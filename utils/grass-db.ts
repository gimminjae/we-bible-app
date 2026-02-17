import type { SQLiteDatabase } from 'expo-sqlite';

const GRASS_TABLE = 'bible_grass';

export type GrassDayEntry = {
  bookCode: string;
  readChapter: number[];
};

/** date string (YYYY-MM-DD) -> array of { bookCode, readChapter } */
export type GrassDataMap = Record<string, GrassDayEntry[]>;

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
      map[r.date] = parseJson<GrassDayEntry[]>(r.data ?? '[]', []);
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
  return day.reduce((sum, e) => sum + e.readChapter.length, 0);
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

  let dayData: GrassDayEntry[] = rows[0]
    ? parseJson<GrassDayEntry[]>(rows[0].data ?? '[]', [])
    : [];

  dayData = dayData.filter((e) => e.bookCode !== bookCode);
  if (readChapters.length > 0) {
    dayData.push({ bookCode, readChapter: readChapters });
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO ${GRASS_TABLE} (date, data) VALUES (?, ?)`,
    date,
    JSON.stringify(dayData)
  );
}

/** Sync grass when user saves in ChapterEditDrawer. prevChapters/newChapters are 1-based chapter numbers. */
export async function syncGrassFromPlanSave(
  db: SQLiteDatabase,
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
    if (p === 1) prevChapters.push(ch);
    if (n === 1) newChapters.push(ch);
  }
  await syncGrassForBook(db, todayString(), bookCode, newChapters);
}
