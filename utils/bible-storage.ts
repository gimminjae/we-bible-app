import type { BibleSearchInfo } from '@/components/bible/types';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

const BIBLE_SEARCH_INFO_KEY = 'bibleSearchInfo';
const APP_THEME_KEY = 'appTheme';
const BIBLE_STATE_TABLE = 'bible_state';
const MAX_AGE = 60 * 60 * 24 * 365; // 1년

function getCookie(key: string): string | null {
  if (typeof document === 'undefined' || typeof document.cookie === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${key}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(key.length + 1));
  } catch {
    return null;
  }
}

function setCookie(key: string, value: string): void {
  if (typeof document === 'undefined' || typeof document.cookie === 'undefined') return;
  document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=${MAX_AGE};samesite=lax`;
}

function parseBibleSearchInfo(raw: string): BibleSearchInfo | null {
  try {
    const parsed = JSON.parse(raw) as BibleSearchInfo;
    if (
      typeof parsed?.bookCode === 'string' &&
      typeof parsed?.chapter === 'number' &&
      typeof parsed?.primaryLang === 'string' &&
      typeof parsed?.fontScale === 'number' &&
      typeof parsed?.dualLang === 'boolean' &&
      typeof parsed?.secondaryLang === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function initBibleStateTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${BIBLE_STATE_TABLE} (key TEXT PRIMARY KEY NOT NULL, value TEXT);
  `);
}

async function getBibleSearchInfoFromDb(db: SQLiteDatabase): Promise<BibleSearchInfo | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    BIBLE_SEARCH_INFO_KEY
  );
  if (!row?.value) return null;
  return parseBibleSearchInfo(row.value);
}

async function setBibleSearchInfoToDb(db: SQLiteDatabase, info: BibleSearchInfo): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    BIBLE_SEARCH_INFO_KEY,
    JSON.stringify(info)
  );
}

/** 웹: 쿠키, 네이티브: db(전달 시) 사용. db 없으면 웹만 쿠키, 네이티브는 null */
export async function getBibleSearchInfo(db?: SQLiteDatabase | null): Promise<BibleSearchInfo | null> {
  if (Platform.OS === 'web') {
    const raw = getCookie(BIBLE_SEARCH_INFO_KEY);
    if (raw) return parseBibleSearchInfo(raw);
    return null;
  }
  if (db) return getBibleSearchInfoFromDb(db);
  return null;
}

/** 웹: 쿠키, 네이티브: db(전달 시)에 저장 */
export async function setBibleSearchInfo(
  info: BibleSearchInfo,
  db?: SQLiteDatabase | null
): Promise<void> {
  if (Platform.OS === 'web') {
    setCookie(BIBLE_SEARCH_INFO_KEY, JSON.stringify(info));
  }
  if (db) await setBibleSearchInfoToDb(db, info);
}

export type AppTheme = 'light' | 'dark';

/** DB에 저장된 테마 조회. 없으면 null */
export async function getAppThemeFromDb(db: SQLiteDatabase): Promise<AppTheme | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    APP_THEME_KEY
  );
  if (row?.value === 'light' || row?.value === 'dark') return row.value;
  return null;
}

/** DB에 테마 저장 */
export async function setAppThemeToDb(db: SQLiteDatabase, theme: AppTheme): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    APP_THEME_KEY,
    theme
  );
}
