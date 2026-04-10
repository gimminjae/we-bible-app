import { createId, formatDateTime } from '@/lib/date';
import { queuePersistedSlicesSave } from '@/lib/sqlite-supabase-store';
import { summarizeRanges } from '@/utils/bible.util';
import type { SQLiteDatabase } from 'expo-sqlite';

const THEME_VERSES_TABLE = 'theme_verses';

export type ThemeVerseRecord = {
  id: number;
  clientId: string;
  year: number;
  bookCode: string;
  chapter: number;
  verse: number;
  verseNumbers: number[];
  verseText: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertThemeVerseInput = {
  year: number;
  bookCode: string;
  chapter: number;
  verseNumbers: number[];
  verseText: string;
  description: string;
};

function nowString(): string {
  return formatDateTime(new Date());
}

export function getCurrentThemeVerseYear(): number {
  return new Date().getFullYear();
}

export function canEditThemeVerseYear(year: number): boolean {
  return year === getCurrentThemeVerseYear();
}

export function formatThemeVerseNumbers(verseNumbers: number[]): string {
  return summarizeRanges(verseNumbers);
}

function normalizeVerseNumbers(raw: unknown, fallbackVerse?: unknown): number[] {
  let parsed = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
  }

  const normalized = (Array.isArray(parsed) ? parsed : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((left, right) => left - right);

  if (normalized.length > 0) return normalized;

  const fallback = Number(fallbackVerse);
  if (Number.isInteger(fallback) && fallback > 0) {
    return [fallback];
  }

  return [];
}

export async function initThemeVersesTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${THEME_VERSES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT DEFAULT '',
      year INTEGER NOT NULL UNIQUE,
      book_code TEXT NOT NULL DEFAULT '',
      chapter INTEGER NOT NULL DEFAULT 1,
      verse INTEGER NOT NULL DEFAULT 1,
      verse_numbers TEXT NOT NULL DEFAULT '[]',
      verse_text TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);

  const info = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${THEME_VERSES_TABLE})`,
  );

  if (!info.some((row) => row.name === 'client_id')) {
    await db.runAsync(`ALTER TABLE ${THEME_VERSES_TABLE} ADD COLUMN client_id TEXT DEFAULT ''`);
  }
  if (!info.some((row) => row.name === 'description')) {
    await db.runAsync(`ALTER TABLE ${THEME_VERSES_TABLE} ADD COLUMN description TEXT NOT NULL DEFAULT ''`);
  }
  if (!info.some((row) => row.name === 'updated_at')) {
    await db.runAsync(`ALTER TABLE ${THEME_VERSES_TABLE} ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
  }
  if (!info.some((row) => row.name === 'verse_numbers')) {
    await db.runAsync(`ALTER TABLE ${THEME_VERSES_TABLE} ADD COLUMN verse_numbers TEXT NOT NULL DEFAULT '[]'`);
  }

  const rows = await db.getAllAsync<{
    id: number;
    verse: number | null;
    verse_numbers: string | null;
  }>(`SELECT id, verse, verse_numbers FROM ${THEME_VERSES_TABLE}`);

  for (const row of rows) {
    const verseNumbers = normalizeVerseNumbers(row.verse_numbers, row.verse);
    const nextRaw = JSON.stringify(verseNumbers);
    if ((row.verse_numbers ?? '') !== nextRaw) {
      await db.runAsync(
        `UPDATE ${THEME_VERSES_TABLE} SET verse = ?, verse_numbers = ? WHERE id = ?`,
        verseNumbers[0] ?? 1,
        nextRaw,
        row.id,
      );
    }
  }
}

function normalizeRow(row: {
  id: number;
  client_id: string | null;
  year: number;
  book_code: string | null;
  chapter: number | null;
  verse: number | null;
  verse_numbers: string | null;
  verse_text: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}): ThemeVerseRecord {
  const verseNumbers = normalizeVerseNumbers(row.verse_numbers, row.verse);
  return {
    id: Number(row.id),
    clientId: row.client_id?.trim() || `theme-verse-${row.id}`,
    year: Number(row.year),
    bookCode: row.book_code ?? '',
    chapter: Math.max(1, Number(row.chapter ?? 1)),
    verse: verseNumbers[0] ?? Math.max(1, Number(row.verse ?? 1)),
    verseNumbers,
    verseText: row.verse_text ?? '',
    description: row.description ?? '',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? row.created_at ?? '',
  };
}

export async function getThemeVerseByYear(
  db: SQLiteDatabase,
  year: number,
): Promise<ThemeVerseRecord | null> {
  const row = await db.getFirstAsync<{
    id: number;
    client_id: string | null;
    year: number;
    book_code: string | null;
    chapter: number | null;
    verse: number | null;
    verse_numbers: string | null;
    verse_text: string | null;
    description: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(`SELECT * FROM ${THEME_VERSES_TABLE} WHERE year = ?`, year);

  return row ? normalizeRow(row) : null;
}

export async function getAllThemeVerses(db: SQLiteDatabase): Promise<ThemeVerseRecord[]> {
  const rows = await db.getAllAsync<{
    id: number;
    client_id: string | null;
    year: number;
    book_code: string | null;
    chapter: number | null;
    verse: number | null;
    verse_numbers: string | null;
    verse_text: string | null;
    description: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(`SELECT * FROM ${THEME_VERSES_TABLE} ORDER BY year DESC, id DESC`);

  return rows.map(normalizeRow);
}

export async function upsertThemeVerse(
  db: SQLiteDatabase,
  input: UpsertThemeVerseInput,
): Promise<number> {
  if (!canEditThemeVerseYear(input.year)) {
    throw new Error('Only the current year can be edited.');
  }

  const existing = await getThemeVerseByYear(db, input.year);
  const timestamp = nowString();
  const verseNumbers = normalizeVerseNumbers(input.verseNumbers);
  const primaryVerse = verseNumbers[0] ?? 1;
  const serializedVerseNumbers = JSON.stringify(verseNumbers);

  if (existing) {
    await db.runAsync(
      `UPDATE ${THEME_VERSES_TABLE}
       SET book_code = ?, chapter = ?, verse = ?, verse_numbers = ?, verse_text = ?, description = ?, updated_at = ?
       WHERE year = ?`,
      input.bookCode,
      input.chapter,
      primaryVerse,
      serializedVerseNumbers,
      input.verseText.trim(),
      input.description.trim(),
      timestamp,
      input.year,
    );
    await queuePersistedSlicesSave(db, ['themeVerses']);
    return existing.id;
  }

  const result = await db.runAsync(
    `INSERT INTO ${THEME_VERSES_TABLE} (
      client_id, year, book_code, chapter, verse, verse_numbers, verse_text, description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    createId(),
    input.year,
    input.bookCode,
    input.chapter,
    primaryVerse,
    serializedVerseNumbers,
    input.verseText.trim(),
    input.description.trim(),
    timestamp,
    timestamp,
  );
  await queuePersistedSlicesSave(db, ['themeVerses']);

  return Number(result.lastInsertRowId);
}

export async function deleteThemeVerseByYear(
  db: SQLiteDatabase,
  year: number,
): Promise<void> {
  if (!canEditThemeVerseYear(year)) {
    throw new Error('Only the current year can be deleted.');
  }

  await db.runAsync(`DELETE FROM ${THEME_VERSES_TABLE} WHERE year = ?`, year);
  await queuePersistedSlicesSave(db, ['themeVerses']);
}
