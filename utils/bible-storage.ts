import type { BibleSearchInfo } from '@/components/bible/types';
import { queuePersistedSlicesSave } from '@/lib/sqlite-supabase-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

const BIBLE_SEARCH_INFO_KEY = 'bibleSearchInfo';
const APP_THEME_KEY = 'appTheme';
const APP_LANGUAGE_KEY = 'appLanguage';
const PENDING_NAVIGATION_KEY = 'pendingBibleNavigation';
const LAST_AUTO_SYNC_AT_KEY = 'lastAutoSyncAt';
const POINT_TOTAL_KEY = 'pointTotal';
const GRASS_COLOR_THEME_KEY = 'grassColorTheme';
const BIBLE_STATE_TABLE = 'bible_state';
const MAX_AGE = 60 * 60 * 24 * 365;
const GRASS_THEME_CHANGE_COST = 100;

function getCookie(key: string): string | null {
  if (typeof document === 'undefined' || typeof document.cookie === 'undefined') return null;
  const match = document
    .cookie
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
    BIBLE_SEARCH_INFO_KEY,
  );
  if (!row?.value) return null;
  return parseBibleSearchInfo(row.value);
}

async function setBibleSearchInfoToDb(db: SQLiteDatabase, info: BibleSearchInfo): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    BIBLE_SEARCH_INFO_KEY,
    JSON.stringify(info),
  );
  await queuePersistedSlicesSave(db, ['appState']);
}

export async function getBibleSearchInfo(db?: SQLiteDatabase | null): Promise<BibleSearchInfo | null> {
  if (Platform.OS === 'web') {
    const raw = getCookie(BIBLE_SEARCH_INFO_KEY);
    return raw ? parseBibleSearchInfo(raw) : null;
  }
  if (db) return getBibleSearchInfoFromDb(db);
  return null;
}

export async function setBibleSearchInfo(
  info: BibleSearchInfo,
  db?: SQLiteDatabase | null,
): Promise<void> {
  if (Platform.OS === 'web') {
    setCookie(BIBLE_SEARCH_INFO_KEY, JSON.stringify(info));
  }
  if (db) await setBibleSearchInfoToDb(db, info);
}

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'ko' | 'en';

export async function getAppThemeFromDb(db: SQLiteDatabase): Promise<AppTheme | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    APP_THEME_KEY,
  );
  if (row?.value === 'light' || row?.value === 'dark') return row.value;
  return null;
}

export async function getAppLanguageFromDb(db: SQLiteDatabase): Promise<AppLanguage | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    APP_LANGUAGE_KEY,
  );
  if (row?.value === 'ko' || row?.value === 'en') return row.value;
  return null;
}

export type PendingBibleNavigation = {
  bookCode: string;
  chapter: number;
};

export async function setPendingBibleNavigation(
  db: SQLiteDatabase,
  nav: PendingBibleNavigation,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    PENDING_NAVIGATION_KEY,
    JSON.stringify(nav),
  );
}

export async function getPendingBibleNavigation(
  db: SQLiteDatabase,
): Promise<PendingBibleNavigation | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    PENDING_NAVIGATION_KEY,
  );
  if (!row?.value) return null;

  try {
    const parsed = JSON.parse(row.value) as PendingBibleNavigation;
    if (typeof parsed?.bookCode === 'string' && typeof parsed?.chapter === 'number') {
      return parsed;
    }
  } catch {}

  return null;
}

export async function clearPendingBibleNavigation(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM ${BIBLE_STATE_TABLE} WHERE key = ?`, PENDING_NAVIGATION_KEY);
}

export async function setAppThemeToDb(db: SQLiteDatabase, theme: AppTheme): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    APP_THEME_KEY,
    theme,
  );
  await queuePersistedSlicesSave(db, ['appState']);
}

export async function setAppLanguageToDb(
  db: SQLiteDatabase,
  appLanguage: AppLanguage,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    APP_LANGUAGE_KEY,
    appLanguage,
  );
  await queuePersistedSlicesSave(db, ['appState']);
}

export async function getLastAutoSyncAtFromDb(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    LAST_AUTO_SYNC_AT_KEY,
  );
  if (!row?.value) return null;
  return row.value;
}

export async function setLastAutoSyncAtToDb(
  db: SQLiteDatabase,
  syncedAt: string,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    LAST_AUTO_SYNC_AT_KEY,
    syncedAt,
  );
}

export type GrassColorTheme =
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'sky';

export async function getPointTotalFromDb(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    POINT_TOTAL_KEY,
  );
  const parsed = Number(row?.value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export async function spendPoints(
  db: SQLiteDatabase,
  amount: number,
): Promise<{ success: boolean; pointTotal: number }> {
  const cost = Math.max(0, Math.floor(amount));
  const currentPoint = await getPointTotalFromDb(db);
  if (currentPoint < cost) {
    return { success: false, pointTotal: currentPoint };
  }

  const nextPoint = currentPoint - cost;
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    POINT_TOTAL_KEY,
    String(nextPoint),
  );
  return { success: true, pointTotal: nextPoint };
}

export async function getGrassColorThemeFromDb(
  db: SQLiteDatabase,
): Promise<GrassColorTheme> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    GRASS_COLOR_THEME_KEY,
  );
  const value = row?.value;
  if (
    value === 'green' ||
    value === 'yellow' ||
    value === 'orange' ||
    value === 'red' ||
    value === 'blue' ||
    value === 'purple' ||
    value === 'sky'
  ) {
    return value;
  }
  return 'green';
}

export async function spendPointsForGrassColorTheme(
  db: SQLiteDatabase,
  nextTheme: GrassColorTheme,
): Promise<{ success: boolean; pointTotal: number; changed: boolean }> {
  const currentTheme = await getGrassColorThemeFromDb(db);
  const currentPoint = await getPointTotalFromDb(db);

  if (currentTheme === nextTheme) {
    return { success: true, pointTotal: currentPoint, changed: false };
  }

  const spendResult = await spendPoints(db, GRASS_THEME_CHANGE_COST);
  if (!spendResult.success) {
    return { success: false, pointTotal: currentPoint, changed: false };
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    GRASS_COLOR_THEME_KEY,
    nextTheme,
  );
  await queuePersistedSlicesSave(db, ['grassData']);

  return { success: true, pointTotal: spendResult.pointTotal, changed: true };
}

export async function setGrassColorThemeWithoutPoint(
  db: SQLiteDatabase,
  nextTheme: GrassColorTheme,
): Promise<boolean> {
  const currentTheme = await getGrassColorThemeFromDb(db);
  if (currentTheme === nextTheme) return false;

  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    GRASS_COLOR_THEME_KEY,
    nextTheme,
  );
  await queuePersistedSlicesSave(db, ['grassData']);
  return true;
}
