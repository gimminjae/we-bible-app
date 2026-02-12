import type { SQLiteDatabase } from 'expo-sqlite';

const TABLE = 'favorite_verses';

export async function initFavoriteVersesTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      book_code TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      PRIMARY KEY (book_code, chapter, verse)
    );
  `);
}

export async function getFavoritesForChapter(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number
): Promise<number[]> {
  const rows = await db.getAllAsync<{ verse: number }>(
    `SELECT verse FROM ${TABLE} WHERE book_code = ? AND chapter = ? ORDER BY verse`,
    bookCode,
    chapter
  );
  return rows.map((r) => r.verse);
}

export async function addFavorites(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
  verseNumbers: number[]
): Promise<void> {
  for (const verse of verseNumbers) {
    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLE} (book_code, chapter, verse) VALUES (?, ?, ?)`,
      bookCode,
      chapter,
      verse
    );
  }
}

export async function removeFavorites(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
  verseNumbers: number[]
): Promise<void> {
  if (verseNumbers.length === 0) return;
  const placeholders = verseNumbers.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM ${TABLE} WHERE book_code = ? AND chapter = ? AND verse IN (${placeholders})`,
    bookCode,
    chapter,
    ...verseNumbers
  );
}
