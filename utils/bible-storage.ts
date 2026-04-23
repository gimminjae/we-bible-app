import type { BibleSearchInfo } from '@/components/bible/types';
import { queuePersistedSlicesSave } from '@/lib/sqlite-supabase-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

const BIBLE_SEARCH_INFO_KEY = 'bibleSearchInfo';
const APP_THEME_KEY = 'appTheme';
const APP_LANGUAGE_KEY = 'appLanguage';
const BIBLE_MEDITATION_NOTIFICATION_ENABLED_KEY = 'bibleMeditationNotificationEnabled';
const BIBLE_MEDITATION_NOTIFICATION_IDS_KEY = 'bibleMeditationNotificationIds';
const THEME_VERSE_NOTIFICATION_SETTINGS_KEY = 'themeVerseNotificationSettings';
const THEME_VERSE_NOTIFICATION_IDS_KEY = 'themeVerseNotificationIds';
const THEME_VERSE_NOTIFICATION_PERMISSION_REQUESTED_KEY =
  'themeVerseNotificationPermissionRequested';
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
export const THEME_VERSE_NOTIFICATION_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type ThemeVerseNotificationWeekday =
  (typeof THEME_VERSE_NOTIFICATION_WEEKDAYS)[number];
export type ThemeVerseNotificationSettings = {
  enabled: boolean;
  weekdays: ThemeVerseNotificationWeekday[];
  hour: number;
  minute: number;
};

export const DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS: ThemeVerseNotificationSettings = {
  enabled: true,
  weekdays: [...THEME_VERSE_NOTIFICATION_WEEKDAYS],
  hour: 9,
  minute: 0,
};

function normalizeThemeVerseNotificationWeekdays(
  raw: unknown,
): ThemeVerseNotificationWeekday[] {
  const normalized = (Array.isArray(raw) ? raw : [])
    .map((value) => Number(value))
    .filter((value): value is ThemeVerseNotificationWeekday =>
      THEME_VERSE_NOTIFICATION_WEEKDAYS.includes(value as ThemeVerseNotificationWeekday),
    )
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((left, right) => left - right);

  return normalized.length > 0
    ? normalized
    : [...DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS.weekdays];
}

function normalizeBoundedInteger(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function normalizeThemeVerseNotificationSettings(
  raw: unknown,
): ThemeVerseNotificationSettings {
  const source =
    raw && typeof raw === 'object' ? (raw as Partial<ThemeVerseNotificationSettings>) : {};

  return {
    enabled: Boolean(source.enabled),
    weekdays: normalizeThemeVerseNotificationWeekdays(source.weekdays),
    hour: normalizeBoundedInteger(
      source.hour,
      DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS.hour,
      0,
      23,
    ),
    minute: normalizeBoundedInteger(
      source.minute,
      DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS.minute,
      0,
      59,
    ),
  };
}

function parseThemeVerseNotificationSettings(raw: string | null): ThemeVerseNotificationSettings {
  if (!raw) return DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS;

  try {
    return normalizeThemeVerseNotificationSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS;
  }
}

function parseThemeVerseNotificationIds(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return (Array.isArray(parsed) ? parsed : [])
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  } catch {
    return [];
  }
}

function parseBooleanState(raw: string | null): boolean {
  return raw === 'true';
}

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

export async function getBibleMeditationNotificationEnabledFromDb(
  db: SQLiteDatabase,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    BIBLE_MEDITATION_NOTIFICATION_ENABLED_KEY,
  );

  return parseBooleanState(row?.value ?? null);
}

export async function setBibleMeditationNotificationEnabledToDb(
  db: SQLiteDatabase,
  enabled: boolean,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    BIBLE_MEDITATION_NOTIFICATION_ENABLED_KEY,
    enabled ? 'true' : 'false',
  );
}

export async function getBibleMeditationNotificationScheduleIdsFromDb(
  db: SQLiteDatabase,
): Promise<string[]> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    BIBLE_MEDITATION_NOTIFICATION_IDS_KEY,
  );

  return parseThemeVerseNotificationIds(row?.value ?? null);
}

export async function setBibleMeditationNotificationScheduleIdsToDb(
  db: SQLiteDatabase,
  identifiers: string[],
): Promise<void> {
  const normalized = identifiers
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);

  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    BIBLE_MEDITATION_NOTIFICATION_IDS_KEY,
    JSON.stringify(normalized),
  );
}

export async function getThemeVerseNotificationSettingsFromDb(
  db: SQLiteDatabase,
): Promise<ThemeVerseNotificationSettings> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    THEME_VERSE_NOTIFICATION_SETTINGS_KEY,
  );

  return parseThemeVerseNotificationSettings(row?.value ?? null);
}

export async function setThemeVerseNotificationSettingsToDb(
  db: SQLiteDatabase,
  settings: ThemeVerseNotificationSettings,
): Promise<void> {
  const normalized = normalizeThemeVerseNotificationSettings(settings);
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    THEME_VERSE_NOTIFICATION_SETTINGS_KEY,
    JSON.stringify(normalized),
  );
}

export async function getThemeVerseNotificationScheduleIdsFromDb(
  db: SQLiteDatabase,
): Promise<string[]> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    THEME_VERSE_NOTIFICATION_IDS_KEY,
  );

  return parseThemeVerseNotificationIds(row?.value ?? null);
}

export async function setThemeVerseNotificationScheduleIdsToDb(
  db: SQLiteDatabase,
  identifiers: string[],
): Promise<void> {
  const normalized = identifiers
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);

  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    THEME_VERSE_NOTIFICATION_IDS_KEY,
    JSON.stringify(normalized),
  );
}

export async function getThemeVerseNotificationPermissionRequestedFromDb(
  db: SQLiteDatabase,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    THEME_VERSE_NOTIFICATION_PERMISSION_REQUESTED_KEY,
  );

  return parseBooleanState(row?.value ?? null);
}

export async function setThemeVerseNotificationPermissionRequestedToDb(
  db: SQLiteDatabase,
  requested: boolean,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    THEME_VERSE_NOTIFICATION_PERMISSION_REQUESTED_KEY,
    requested ? 'true' : 'false',
  );
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
