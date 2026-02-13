import type { SQLiteDatabase } from 'expo-sqlite';

const MEMOS_TABLE = 'memos';
const MEMO_VERSES_TABLE = 'memo_verses';

export type MemoRecord = {
  id: number;
  title: string;
  content: string;
  verseText: string;
  createdAt: string;
};

/** 저장 시각 'YYYY-MM-DD HH:mm:ss' */
function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function initMemosTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${MEMOS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      verse_text TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ${MEMO_VERSES_TABLE} (
      memo_id INTEGER NOT NULL,
      book_code TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      PRIMARY KEY (memo_id, book_code, chapter, verse),
      FOREIGN KEY (memo_id) REFERENCES ${MEMOS_TABLE}(id) ON DELETE CASCADE
    );
  `);
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${MEMOS_TABLE})`);
  if (!info.some((r) => r.name === 'verse_text')) {
    await db.runAsync(`ALTER TABLE ${MEMOS_TABLE} ADD COLUMN verse_text TEXT DEFAULT ''`);
  }
}

export async function addMemo(
  db: SQLiteDatabase,
  title: string,
  content: string,
  verseText: string,
  bookCode: string,
  chapter: number,
  verseNumbers: number[]
): Promise<void> {
  if (verseNumbers.length === 0) return;
  const createdAt = nowString();
  const result = await db.runAsync(
    `INSERT INTO ${MEMOS_TABLE} (title, content, verse_text, created_at) VALUES (?, ?, ?, ?)`,
    title.trim() || '',
    content.trim() || '',
    verseText.trim() || '',
    createdAt
  );
  const memoId = Number(result.lastInsertRowId);
  if (!memoId) return;
  for (const verse of verseNumbers) {
    await db.runAsync(
      `INSERT INTO ${MEMO_VERSES_TABLE} (memo_id, book_code, chapter, verse) VALUES (?, ?, ?, ?)`,
      memoId,
      bookCode,
      chapter,
      verse
    );
  }
}

/** 현재 장에서 메모가 있는 절 번호 목록 */
export async function getMemoVerseNumbersForChapter(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number
): Promise<number[]> {
  const rows = await db.getAllAsync<{ verse: number }>(
    `SELECT DISTINCT verse FROM ${MEMO_VERSES_TABLE} WHERE book_code = ? AND chapter = ? ORDER BY verse`,
    bookCode,
    chapter
  );
  return rows.map((r) => r.verse);
}

/** 메모 목록 조회 (최신순) */
export async function getAllMemos(db: SQLiteDatabase): Promise<MemoRecord[]> {
  const rows = await db.getAllAsync<{
    id: number;
    title: string;
    content: string;
    verse_text: string;
    created_at: string;
  }>(
    `SELECT id, title, content, verse_text, created_at FROM ${MEMOS_TABLE} ORDER BY created_at DESC, id DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    content: r.content ?? '',
    verseText: r.verse_text ?? '',
    createdAt: r.created_at ?? '',
  }));
}

/** 메모 상세 조회 */
export async function getMemoById(db: SQLiteDatabase, id: number): Promise<MemoRecord | null> {
  const row = await db.getFirstAsync<{
    id: number;
    title: string;
    content: string;
    verse_text: string;
    created_at: string;
  }>(
    `SELECT id, title, content, verse_text, created_at FROM ${MEMOS_TABLE} WHERE id = ?`,
    id
  );
  if (!row) return null;
  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    verseText: row.verse_text ?? '',
    createdAt: row.created_at ?? '',
  };
}
