import type { FavoriteVerseRecord } from '@/components/bible/types';
import { getActiveUserId } from '@/lib/auth-state';
import { createSupabaseClient } from '@/lib/supabase-client';
import { queuePersistedSlicesSave } from '@/lib/sqlite-supabase-store';
import type { SQLiteDatabase } from 'expo-sqlite';

const TABLE = 'favorite_verses';

function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function ensureLocalFavoriteVersesTable(db: SQLiteDatabase): Promise<void> {
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

function toSupabaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error('FAVORITES_REMOTE_ERROR');
}

export async function initFavoriteVersesTable(db: SQLiteDatabase): Promise<void> {
  if (getActiveUserId()) return;
  await ensureLocalFavoriteVersesTable(db);
}

export async function getFavoritesForChapter(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
): Promise<number[]> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('verse')
      .eq('user_id', userId)
      .eq('book_code', bookCode)
      .eq('chapter', chapter)
      .order('verse', { ascending: true });

    if (error) throw toSupabaseError(error);
    return (data ?? []).map((row) => Number((row as { verse?: unknown }).verse ?? 0));
  }

  await ensureLocalFavoriteVersesTable(db);
  const rows = await db.getAllAsync<{ verse: number }>(
    `SELECT verse FROM ${TABLE} WHERE book_code = ? AND chapter = ? ORDER BY verse`,
    bookCode,
    chapter,
  );
  return rows.map((r) => r.verse);
}

export type FavoriteVerseInput = { verse: number; text: string };

export async function addFavorites(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
  verses: FavoriteVerseInput[],
): Promise<void> {
  const userId = getActiveUserId();
  const createdAt = nowString();

  if (userId) {
    if (verses.length === 0) return;
    const supabase = createSupabaseClient();
    const payload = verses.map(({ verse, text }) => ({
      user_id: userId,
      book_code: bookCode,
      chapter,
      verse,
      verse_text: text ?? '',
      created_at: createdAt,
    }));
    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'user_id,book_code,chapter,verse' });
    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalFavoriteVersesTable(db);
  for (const { verse, text } of verses) {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${TABLE} (book_code, chapter, verse, verse_text, created_at) VALUES (?, ?, ?, ?, ?)`,
      bookCode,
      chapter,
      verse,
      text ?? '',
      createdAt,
    );
  }
  await queuePersistedSlicesSave(db, ['favorites']);
}

export async function removeFavorites(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
  verseNumbers: number[],
): Promise<void> {
  if (verseNumbers.length === 0) return;

  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('book_code', bookCode)
      .eq('chapter', chapter)
      .in('verse', verseNumbers);

    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalFavoriteVersesTable(db);
  const placeholders = verseNumbers.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM ${TABLE} WHERE book_code = ? AND chapter = ? AND verse IN (${placeholders})`,
    bookCode,
    chapter,
    ...verseNumbers,
  );
  await queuePersistedSlicesSave(db, ['favorites']);
}

export async function getAllFavorites(db: SQLiteDatabase): Promise<FavoriteVerseRecord[]> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('book_code, chapter, verse, verse_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('verse', { ascending: false });

    if (error) throw toSupabaseError(error);

    return (data ?? []).map((row) => ({
      bookCode: String((row as { book_code?: unknown }).book_code ?? ''),
      chapter: Number((row as { chapter?: unknown }).chapter ?? 0),
      verse: Number((row as { verse?: unknown }).verse ?? 0),
      verseText: String((row as { verse_text?: unknown }).verse_text ?? ''),
      createdAt: String((row as { created_at?: unknown }).created_at ?? ''),
    }));
  }

  await ensureLocalFavoriteVersesTable(db);
  const rows = await db.getAllAsync<{
    book_code: string;
    chapter: number;
    verse: number;
    verse_text: string;
    created_at: string;
  }>(
    `SELECT book_code, chapter, verse, verse_text, created_at FROM ${TABLE} ORDER BY created_at DESC, rowid DESC`,
  );
  return rows.map((r) => ({
    bookCode: r.book_code,
    chapter: r.chapter,
    verse: r.verse,
    verseText: r.verse_text ?? '',
    createdAt: r.created_at ?? '',
  }));
}
