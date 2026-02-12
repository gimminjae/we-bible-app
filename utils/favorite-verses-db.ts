import type { FavoriteVerseRecord } from '@/components/bible/types';
import type { SQLiteDatabase } from 'expo-sqlite';

const TABLE = 'favorite_verses';

/** 관심 구절 식별 키: 오직 (book_code, chapter, verse). verse_text·created_at은 보기용 */

/** 현재 시각을 'YYYY-MM-DD HH:mm:ss' 형식으로 반환 */
function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function initFavoriteVersesTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      book_code TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      verse_text TEXT DEFAULT '',
      created_at TEXT DEFAULT '',
      PRIMARY KEY (book_code, chapter, verse)
    );
  `);
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${TABLE})`);
  if (!info.some((r) => r.name === 'verse_text')) {
    await db.runAsync(`ALTER TABLE ${TABLE} ADD COLUMN verse_text TEXT DEFAULT ''`);
  }
  if (!info.some((r) => r.name === 'created_at')) {
    await db.runAsync(`ALTER TABLE ${TABLE} ADD COLUMN created_at TEXT DEFAULT ''`);
  }
}

/** 현재 장에서 관심인 절 번호만 조회 (식별: book_code + chapter + verse) */
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

/** 추가 시 입력. verse=식별용 절 번호, text=보기용 구절 본문 */
export type FavoriteVerseInput = { verse: number; text: string };

/** 관심 추가. 식별은 (book_code, chapter, verse)로만 함. verse_text·created_at은 보기용 저장 */
export async function addFavorites(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
  verses: FavoriteVerseInput[]
): Promise<void> {
  const createdAt = nowString();
  for (const { verse, text } of verses) {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE} (book_code, chapter, verse, verse_text, created_at) VALUES (?, ?, ?, ?, ?)`,
      bookCode,
      chapter,
      verse,
      text ?? '',
      createdAt
    );
  }
}

/** 관심 해제. 식별은 (book_code, chapter, verse)로만 함 */
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

/** 리스트용 전체 조회. 각 행 식별은 (book_code, chapter, verse). verse_text·created_at은 표시용 */
export async function getAllFavorites(
  db: SQLiteDatabase
): Promise<FavoriteVerseRecord[]> {
  const rows = await db.getAllAsync<{
    book_code: string;
    chapter: number;
    verse: number;
    verse_text: string;
    created_at: string;
  }>(`SELECT book_code, chapter, verse, verse_text, created_at FROM ${TABLE} ORDER BY created_at DESC, rowid DESC`);
  return rows.map((r) => ({
    bookCode: r.book_code,
    chapter: r.chapter,
    verse: r.verse,
    verseText: r.verse_text ?? '',
    createdAt: r.created_at ?? '',
  }));
}
