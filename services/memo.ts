import { createId } from '@/lib/date';
import { getActiveUserId } from '@/lib/auth-state';
import { createSupabaseClient } from '@/lib/supabase-client';
import { queuePersistedSlicesSave } from '@/services/persisted-state';
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

function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function ensureLocalMemosTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${MEMOS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT DEFAULT '',
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
  if (!info.some((r) => r.name === 'client_id')) {
    await db.runAsync(`ALTER TABLE ${MEMOS_TABLE} ADD COLUMN client_id TEXT DEFAULT ''`);
  }
  if (!info.some((r) => r.name === 'verse_text')) {
    await db.runAsync(`ALTER TABLE ${MEMOS_TABLE} ADD COLUMN verse_text TEXT DEFAULT ''`);
  }
}

function toSupabaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error('MEMOS_REMOTE_ERROR');
}

function normalizeMemoRow(row: {
  id?: unknown;
  title?: unknown;
  content?: unknown;
  verse_text?: unknown;
  created_at?: unknown;
}): MemoRecord {
  return {
    id: Number(row.id ?? 0),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    verseText: String(row.verse_text ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

export async function initMemosTable(db: SQLiteDatabase): Promise<void> {
  if (getActiveUserId()) return;
  await ensureLocalMemosTable(db);
}

export async function addMemo(
  db: SQLiteDatabase,
  title: string,
  content: string,
  verseText: string,
  bookCode: string,
  chapter: number,
  verseNumbers: number[],
): Promise<void> {
  const userId = getActiveUserId();
  const createdAt = nowString();

  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(MEMOS_TABLE)
      .insert({
        user_id: userId,
        client_id: createId(),
        title: title.trim() || '',
        content: content.trim() || '',
        verse_text: verseText.trim() || '',
        created_at: createdAt,
      })
      .select('id')
      .single();

    if (error) throw toSupabaseError(error);
    const memoId = Number((data as { id?: unknown } | null)?.id ?? 0);
    if (!memoId) return;

    if (verseNumbers.length > 0) {
      const payload = verseNumbers.map((verse) => ({
        user_id: userId,
        memo_id: memoId,
        book_code: bookCode,
        chapter,
        verse,
      }));
      const { error: verseError } = await supabase.from(MEMO_VERSES_TABLE).insert(payload);
      if (verseError) throw toSupabaseError(verseError);
    }
    return;
  }

  await ensureLocalMemosTable(db);
  const result = await db.runAsync(
    `INSERT INTO ${MEMOS_TABLE} (client_id, title, content, verse_text, created_at) VALUES (?, ?, ?, ?, ?)`,
    createId(),
    title.trim() || '',
    content.trim() || '',
    verseText.trim() || '',
    createdAt,
  );
  const memoId = Number(result.lastInsertRowId);
  if (!memoId) return;
  for (const verse of verseNumbers) {
    await db.runAsync(
      `INSERT INTO ${MEMO_VERSES_TABLE} (memo_id, book_code, chapter, verse) VALUES (?, ?, ?, ?)`,
      memoId,
      bookCode,
      chapter,
      verse,
    );
  }
  await queuePersistedSlicesSave(db, ['memos']);
}

export async function addMemoWithoutVerse(
  db: SQLiteDatabase,
  title: string,
  content: string,
): Promise<void> {
  const userId = getActiveUserId();
  const createdAt = nowString();

  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from(MEMOS_TABLE).insert({
      user_id: userId,
      client_id: createId(),
      title: title.trim() || '',
      content: content.trim() || '',
      verse_text: '',
      created_at: createdAt,
    });
    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalMemosTable(db);
  await db.runAsync(
    `INSERT INTO ${MEMOS_TABLE} (client_id, title, content, verse_text, created_at) VALUES (?, ?, ?, ?, ?)`,
    createId(),
    title.trim() || '',
    content.trim() || '',
    '',
    createdAt,
  );
  await queuePersistedSlicesSave(db, ['memos']);
}

export async function getMemoVerseNumbersForChapter(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
): Promise<number[]> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(MEMO_VERSES_TABLE)
      .select('verse')
      .eq('user_id', userId)
      .eq('book_code', bookCode)
      .eq('chapter', chapter)
      .order('verse', { ascending: true });

    if (error) throw toSupabaseError(error);
    return (data ?? []).map((row) => Number((row as { verse?: unknown }).verse ?? 0));
  }

  await ensureLocalMemosTable(db);
  const rows = await db.getAllAsync<{ verse: number }>(
    `SELECT DISTINCT verse FROM ${MEMO_VERSES_TABLE} WHERE book_code = ? AND chapter = ? ORDER BY verse`,
    bookCode,
    chapter,
  );
  return rows.map((r) => r.verse);
}

export async function getAllMemos(db: SQLiteDatabase): Promise<MemoRecord[]> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(MEMOS_TABLE)
      .select('id, title, content, verse_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (error) throw toSupabaseError(error);
    return (data ?? []).map((row) => normalizeMemoRow(row as Record<string, unknown>));
  }

  await ensureLocalMemosTable(db);
  const rows = await db.getAllAsync<{
    id: number;
    title: string;
    content: string;
    verse_text: string;
    created_at: string;
  }>(
    `SELECT id, title, content, verse_text, created_at FROM ${MEMOS_TABLE} ORDER BY created_at DESC, id DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    content: r.content ?? '',
    verseText: r.verse_text ?? '',
    createdAt: r.created_at ?? '',
  }));
}

export async function updateMemo(
  db: SQLiteDatabase,
  id: number,
  title: string,
  content: string,
): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from(MEMOS_TABLE)
      .update({
        title: title.trim() || '',
        content: content.trim() || '',
      })
      .eq('user_id', userId)
      .eq('id', id);

    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalMemosTable(db);
  await db.runAsync(
    `UPDATE ${MEMOS_TABLE} SET title = ?, content = ? WHERE id = ?`,
    title.trim() || '',
    content.trim() || '',
    id,
  );
  await queuePersistedSlicesSave(db, ['memos']);
}

export async function deleteMemo(db: SQLiteDatabase, id: number): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from(MEMOS_TABLE).delete().eq('user_id', userId).eq('id', id);
    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalMemosTable(db);
  await db.runAsync(`DELETE FROM ${MEMOS_TABLE} WHERE id = ?`, id);
  await queuePersistedSlicesSave(db, ['memos']);
}

export async function getMemoById(db: SQLiteDatabase, id: number): Promise<MemoRecord | null> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(MEMOS_TABLE)
      .select('id, title, content, verse_text, created_at')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();

    if (error) throw toSupabaseError(error);
    return data ? normalizeMemoRow(data as Record<string, unknown>) : null;
  }

  await ensureLocalMemosTable(db);
  const row = await db.getFirstAsync<{
    id: number;
    title: string;
    content: string;
    verse_text: string;
    created_at: string;
  }>(
    `SELECT id, title, content, verse_text, created_at FROM ${MEMOS_TABLE} WHERE id = ?`,
    id,
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
