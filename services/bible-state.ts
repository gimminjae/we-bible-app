import type { BibleSearchInfo } from '@/components/bible/types';
import { getActiveUserId } from '@/lib/auth-state';
import { authStorage } from '@/lib/auth-storage';
import { createSupabaseClient } from '@/lib/supabase-client';
import type { SQLiteDatabase } from 'expo-sqlite';

const BIBLE_SEARCH_INFO_KEY = 'bibleSearchInfo';
const APP_THEME_KEY = 'appTheme';
const APP_LANGUAGE_KEY = 'appLanguage';
const BIBLE_MEDITATION_NOTIFICATION_ENABLED_KEY = 'bibleMeditationNotificationEnabled';
const BIBLE_MEDITATION_NOTIFICATION_TIME_KEY = 'bibleMeditationNotificationTime';
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
const GRASS_TABLE = 'bible_grass';
const GRASS_META_ROW_DATE = '__meta__';
const LOCAL_STATE_PREFIX = 'bible-state:';
const GRASS_THEME_CHANGE_COST = 100;
const ACTIVE_DATA_USER_ID_KEY = 'activeDataUserId';

function getScopedLocalStateKey(ownerId: string, key: string): string {
  return `${LOCAL_STATE_PREFIX}${ownerId}:${key}`;
}

function getLegacyGuestStateKey(key: string): string {
  return getScopedLocalStateKey('guest', key);
}

function requireDb(db?: SQLiteDatabase | null): SQLiteDatabase {
  if (!db) {
    throw new Error('SQLITE_DB_REQUIRED');
  }
  return db;
}

async function ensureLocalBibleStateTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ${BIBLE_STATE_TABLE} (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT DEFAULT ''
    );
  `);
}

async function getSQLiteStateValue(db: SQLiteDatabase, key: string): Promise<string | null> {
  await ensureLocalBibleStateTable(db);
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    key,
  );
  return row?.value ?? null;
}

async function setSQLiteStateValue(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await ensureLocalBibleStateTable(db);
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    key,
    value,
  );
}

async function removeSQLiteStateValue(db: SQLiteDatabase, key: string): Promise<void> {
  await ensureLocalBibleStateTable(db);
  await db.runAsync(`DELETE FROM ${BIBLE_STATE_TABLE} WHERE key = ?`, key);
}

async function getUserScopedLocalStateValue(key: string): Promise<string | null> {
  const userId = getActiveUserId();
  if (!userId) return null;
  return authStorage.getItem(getScopedLocalStateKey(userId, key));
}

async function setUserScopedLocalStateValue(key: string, value: string): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) return;
  await authStorage.setItem(getScopedLocalStateKey(userId, key), value);
}

async function removeUserScopedLocalStateValue(key: string): Promise<void> {
  const userId = getActiveUserId();
  if (!userId) return;
  await authStorage.removeItem(getScopedLocalStateKey(userId, key));
}

async function getGuestStateValue(db: SQLiteDatabase, key: string): Promise<string | null> {
  const localDataOwnerUserId = await getSQLiteStateValue(db, ACTIVE_DATA_USER_ID_KEY);
  if (localDataOwnerUserId) {
    return null;
  }

  const value = await getSQLiteStateValue(db, key);
  if (value != null) {
    return value;
  }

  const legacyValue = await authStorage.getItem(getLegacyGuestStateKey(key));
  if (legacyValue == null) {
    return null;
  }

  await setSQLiteStateValue(db, key, legacyValue);
  await authStorage.removeItem(getLegacyGuestStateKey(key));
  return legacyValue;
}

async function setGuestStateValue(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await setSQLiteStateValue(db, key, value);
  await authStorage.removeItem(getLegacyGuestStateKey(key));
}

async function removeGuestStateValue(db: SQLiteDatabase, key: string): Promise<void> {
  await removeSQLiteStateValue(db, key);
  await authStorage.removeItem(getLegacyGuestStateKey(key));
}

async function getDeviceLocalStateValue(
  db: SQLiteDatabase,
  key: string,
): Promise<string | null> {
  if (getActiveUserId()) {
    return await getUserScopedLocalStateValue(key);
  }
  return await getGuestStateValue(db, key);
}

async function setDeviceLocalStateValue(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  if (getActiveUserId()) {
    await setUserScopedLocalStateValue(key, value);
    return;
  }
  await setGuestStateValue(db, key, value);
}

async function removeDeviceLocalStateValue(db: SQLiteDatabase, key: string): Promise<void> {
  if (getActiveUserId()) {
    await removeUserScopedLocalStateValue(key);
    return;
  }
  await removeGuestStateValue(db, key);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'SUPABASE_STORAGE_ERROR';
}

function parseBibleSearchInfoValue(raw: unknown): BibleSearchInfo | null {
  const parsed =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        })()
      : raw;
  const candidate =
    parsed && typeof parsed === 'object' ? (parsed as Partial<BibleSearchInfo>) : null;

  if (
    typeof candidate?.bookCode === 'string' &&
    typeof candidate.chapter === 'number' &&
    typeof candidate.primaryLang === 'string' &&
    typeof candidate.fontScale === 'number' &&
    typeof candidate.dualLang === 'boolean' &&
    typeof candidate.secondaryLang === 'string'
  ) {
    return candidate as BibleSearchInfo;
  }

  return null;
}

type RemoteBibleStateRow = {
  app_theme: unknown;
  app_language: unknown;
  bible_search_info: unknown;
};

async function getRemoteBibleStateRow(userId: string): Promise<RemoteBibleStateRow | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from(BIBLE_STATE_TABLE)
    .select('app_theme, app_language, bible_search_info')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data as RemoteBibleStateRow | null) ?? null;
}

async function upsertRemoteBibleState(
  userId: string,
  payload: Partial<{
    app_theme: AppTheme;
    app_language: AppLanguage;
    bible_search_info: BibleSearchInfo;
  }>,
): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from(BIBLE_STATE_TABLE).upsert(
    {
      user_id: userId,
      ...payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function initBibleStateTable(db: SQLiteDatabase): Promise<void> {
  if (getActiveUserId()) return;
  await ensureLocalBibleStateTable(db);
}

export async function getBibleSearchInfo(
  db?: SQLiteDatabase | null,
): Promise<BibleSearchInfo | null> {
  const userId = getActiveUserId();
  if (userId) {
    const row = await getRemoteBibleStateRow(userId);
    return parseBibleSearchInfoValue(row?.bible_search_info ?? null);
  }

  return parseBibleSearchInfoValue(
    await getGuestStateValue(requireDb(db), BIBLE_SEARCH_INFO_KEY),
  );
}

export async function setBibleSearchInfo(
  info: BibleSearchInfo,
  db?: SQLiteDatabase | null,
): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    await upsertRemoteBibleState(userId, { bible_search_info: info });
    return;
  }

  await setGuestStateValue(requireDb(db), BIBLE_SEARCH_INFO_KEY, JSON.stringify(info));
}

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'ko' | 'en';
export type BibleMeditationNotificationTime = {
  hour: number;
  minute: number;
};
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

export const DEFAULT_BIBLE_MEDITATION_NOTIFICATION_TIME: BibleMeditationNotificationTime = {
  hour: 21,
  minute: 0,
};
export const DEFAULT_BIBLE_MEDITATION_NOTIFICATION_ENABLED = true;

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

export function normalizeBibleMeditationNotificationTime(
  raw: unknown,
): BibleMeditationNotificationTime {
  const source =
    raw && typeof raw === 'object' ? (raw as Partial<BibleMeditationNotificationTime>) : {};

  return {
    hour: normalizeBoundedInteger(
      source.hour,
      DEFAULT_BIBLE_MEDITATION_NOTIFICATION_TIME.hour,
      0,
      23,
    ),
    minute: normalizeBoundedInteger(
      source.minute,
      DEFAULT_BIBLE_MEDITATION_NOTIFICATION_TIME.minute,
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

function parseBibleMeditationNotificationTime(raw: string | null): BibleMeditationNotificationTime {
  if (!raw) return DEFAULT_BIBLE_MEDITATION_NOTIFICATION_TIME;

  try {
    return normalizeBibleMeditationNotificationTime(JSON.parse(raw));
  } catch {
    return DEFAULT_BIBLE_MEDITATION_NOTIFICATION_TIME;
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
  const userId = getActiveUserId();
  if (userId) {
    const row = await getRemoteBibleStateRow(userId);
    if (row?.app_theme === 'light' || row?.app_theme === 'dark') {
      return row.app_theme;
    }
    return null;
  }

  const value = await getGuestStateValue(db, APP_THEME_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export async function getAppLanguageFromDb(db: SQLiteDatabase): Promise<AppLanguage | null> {
  const userId = getActiveUserId();
  if (userId) {
    const row = await getRemoteBibleStateRow(userId);
    if (row?.app_language === 'ko' || row?.app_language === 'en') {
      return row.app_language;
    }
    return null;
  }

  const value = await getGuestStateValue(db, APP_LANGUAGE_KEY);
  return value === 'ko' || value === 'en' ? value : null;
}

export async function getBibleMeditationNotificationEnabledFromDb(
  db: SQLiteDatabase,
): Promise<boolean> {
  const value = await getDeviceLocalStateValue(db, BIBLE_MEDITATION_NOTIFICATION_ENABLED_KEY);
  return value == null ? DEFAULT_BIBLE_MEDITATION_NOTIFICATION_ENABLED : parseBooleanState(value);
}

export async function setBibleMeditationNotificationEnabledToDb(
  db: SQLiteDatabase,
  enabled: boolean,
): Promise<void> {
  await setDeviceLocalStateValue(
    db,
    BIBLE_MEDITATION_NOTIFICATION_ENABLED_KEY,
    enabled ? 'true' : 'false',
  );
}

export async function getBibleMeditationNotificationTimeFromDb(
  db: SQLiteDatabase,
): Promise<BibleMeditationNotificationTime> {
  return parseBibleMeditationNotificationTime(
    await getDeviceLocalStateValue(db, BIBLE_MEDITATION_NOTIFICATION_TIME_KEY),
  );
}

export async function setBibleMeditationNotificationTimeToDb(
  db: SQLiteDatabase,
  time: BibleMeditationNotificationTime,
): Promise<void> {
  const normalized = normalizeBibleMeditationNotificationTime(time);
  await setDeviceLocalStateValue(
    db,
    BIBLE_MEDITATION_NOTIFICATION_TIME_KEY,
    JSON.stringify(normalized),
  );
}

export async function getBibleMeditationNotificationScheduleIdsFromDb(
  db: SQLiteDatabase,
): Promise<string[]> {
  return parseThemeVerseNotificationIds(
    await getDeviceLocalStateValue(db, BIBLE_MEDITATION_NOTIFICATION_IDS_KEY),
  );
}

export async function setBibleMeditationNotificationScheduleIdsToDb(
  db: SQLiteDatabase,
  identifiers: string[],
): Promise<void> {
  const normalized = identifiers
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);

  await setDeviceLocalStateValue(
    db,
    BIBLE_MEDITATION_NOTIFICATION_IDS_KEY,
    JSON.stringify(normalized),
  );
}

export async function getThemeVerseNotificationSettingsFromDb(
  db: SQLiteDatabase,
): Promise<ThemeVerseNotificationSettings> {
  return parseThemeVerseNotificationSettings(
    await getDeviceLocalStateValue(db, THEME_VERSE_NOTIFICATION_SETTINGS_KEY),
  );
}

export async function setThemeVerseNotificationSettingsToDb(
  db: SQLiteDatabase,
  settings: ThemeVerseNotificationSettings,
): Promise<void> {
  const normalized = normalizeThemeVerseNotificationSettings(settings);
  await setDeviceLocalStateValue(
    db,
    THEME_VERSE_NOTIFICATION_SETTINGS_KEY,
    JSON.stringify(normalized),
  );
}

export async function getThemeVerseNotificationScheduleIdsFromDb(
  db: SQLiteDatabase,
): Promise<string[]> {
  return parseThemeVerseNotificationIds(
    await getDeviceLocalStateValue(db, THEME_VERSE_NOTIFICATION_IDS_KEY),
  );
}

export async function setThemeVerseNotificationScheduleIdsToDb(
  db: SQLiteDatabase,
  identifiers: string[],
): Promise<void> {
  const normalized = identifiers
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);

  await setDeviceLocalStateValue(
    db,
    THEME_VERSE_NOTIFICATION_IDS_KEY,
    JSON.stringify(normalized),
  );
}

export async function getThemeVerseNotificationPermissionRequestedFromDb(
  db: SQLiteDatabase,
): Promise<boolean> {
  return parseBooleanState(
    await getDeviceLocalStateValue(db, THEME_VERSE_NOTIFICATION_PERMISSION_REQUESTED_KEY),
  );
}

export async function setThemeVerseNotificationPermissionRequestedToDb(
  db: SQLiteDatabase,
  requested: boolean,
): Promise<void> {
  await setDeviceLocalStateValue(
    db,
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
  await setDeviceLocalStateValue(db, PENDING_NAVIGATION_KEY, JSON.stringify(nav));
}

export async function getPendingBibleNavigation(
  db: SQLiteDatabase,
): Promise<PendingBibleNavigation | null> {
  const raw = await getDeviceLocalStateValue(db, PENDING_NAVIGATION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingBibleNavigation;
    if (typeof parsed?.bookCode === 'string' && typeof parsed?.chapter === 'number') {
      return parsed;
    }
  } catch {}

  return null;
}

export async function clearPendingBibleNavigation(db: SQLiteDatabase): Promise<void> {
  await removeDeviceLocalStateValue(db, PENDING_NAVIGATION_KEY);
}

export async function setAppThemeToDb(db: SQLiteDatabase, theme: AppTheme): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    await upsertRemoteBibleState(userId, { app_theme: theme });
    return;
  }

  await setGuestStateValue(db, APP_THEME_KEY, theme);
}

export async function setAppLanguageToDb(
  db: SQLiteDatabase,
  appLanguage: AppLanguage,
): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    await upsertRemoteBibleState(userId, { app_language: appLanguage });
    return;
  }

  await setGuestStateValue(db, APP_LANGUAGE_KEY, appLanguage);
}

export async function getLastAutoSyncAtFromDb(db: SQLiteDatabase): Promise<string | null> {
  return await getDeviceLocalStateValue(db, LAST_AUTO_SYNC_AT_KEY);
}

export async function setLastAutoSyncAtToDb(
  db: SQLiteDatabase,
  syncedAt: string,
): Promise<void> {
  await setDeviceLocalStateValue(db, LAST_AUTO_SYNC_AT_KEY, syncedAt);
}

export type GrassColorTheme =
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'sky';

function parseGrassTheme(raw: unknown): GrassColorTheme {
  return raw === 'green' ||
    raw === 'yellow' ||
    raw === 'orange' ||
    raw === 'red' ||
    raw === 'blue' ||
    raw === 'purple' ||
    raw === 'sky'
    ? raw
    : 'green';
}

type RemoteGrassMetaRow = {
  data: unknown;
};

async function getRemoteGrassMetaRow(userId: string): Promise<RemoteGrassMetaRow | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from(GRASS_TABLE)
    .select('data')
    .eq('user_id', userId)
    .eq('date', GRASS_META_ROW_DATE)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data as RemoteGrassMetaRow | null) ?? null;
}

async function setRemoteGrassTheme(userId: string, theme: GrassColorTheme): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from(GRASS_TABLE).upsert(
    {
      user_id: userId,
      date: GRASS_META_ROW_DATE,
      data: {
        type: 'meta',
        grassTheme: theme,
      },
    },
    { onConflict: 'user_id,date' },
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getPointTotalFromDb(db: SQLiteDatabase): Promise<number> {
  const raw = await getDeviceLocalStateValue(db, POINT_TOTAL_KEY);
  const parsed = Number(raw ?? 0);
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
  await setDeviceLocalStateValue(db, POINT_TOTAL_KEY, String(nextPoint));
  return { success: true, pointTotal: nextPoint };
}

export async function getGrassColorThemeFromDb(db: SQLiteDatabase): Promise<GrassColorTheme> {
  const userId = getActiveUserId();
  if (userId) {
    const row = await getRemoteGrassMetaRow(userId);
    const raw =
      row?.data && typeof row.data === 'object' && row.data !== null
        ? (row.data as { grassTheme?: unknown }).grassTheme
        : null;
    return parseGrassTheme(raw);
  }

  return parseGrassTheme(await getGuestStateValue(db, GRASS_COLOR_THEME_KEY));
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

  const userId = getActiveUserId();
  if (userId) {
    await setRemoteGrassTheme(userId, nextTheme);
  } else {
    await setGuestStateValue(db, GRASS_COLOR_THEME_KEY, nextTheme);
  }

  return { success: true, pointTotal: spendResult.pointTotal, changed: true };
}

export async function setGrassColorThemeWithoutPoint(
  db: SQLiteDatabase,
  nextTheme: GrassColorTheme,
): Promise<boolean> {
  const currentTheme = await getGrassColorThemeFromDb(db);
  if (currentTheme === nextTheme) return false;

  const userId = getActiveUserId();
  if (userId) {
    await setRemoteGrassTheme(userId, nextTheme);
  } else {
    await setGuestStateValue(db, GRASS_COLOR_THEME_KEY, nextTheme);
  }

  return true;
}
