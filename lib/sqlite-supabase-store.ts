import type { BibleSearchInfo, FavoriteVerseRecord } from '@/components/bible/types';
import { getActiveUserId } from '@/lib/auth-state';
import {
  BIBLE_BOOKS,
  createEmptyGoalStatus,
  recalcPlanFields,
  type GoalStatus,
} from '@/lib/plan';
import { createSupabaseClient } from '@/lib/supabase-client';
import { isSQLiteStateSyncPaused } from '@/lib/sqlite-sync-control';
import type { SQLiteDatabase } from 'expo-sqlite';

export const USER_BIBLE_STATE_TABLE = 'bible_state';
export const USER_FAVORITES_TABLE = 'favorite_verses';
export const USER_MEMOS_TABLE = 'memos';
export const USER_MEMO_VERSES_TABLE = 'memo_verses';
export const USER_PLANS_TABLE = 'plans';
export const USER_PRAYERS_TABLE = 'prayers';
export const USER_PRAYER_CONTENTS_TABLE = 'prayer_contents';
export const USER_GRASS_TABLE = 'bible_grass';

const BIBLE_STATE_TABLE = 'bible_state';
const FAVORITES_TABLE = 'favorite_verses';
const MEMOS_TABLE = 'memos';
const MEMO_VERSES_TABLE = 'memo_verses';
const PLANS_TABLE = 'plans';
const PRAYERS_TABLE = 'prayers';
const PRAYER_CONTENTS_TABLE = 'prayer_contents';
const GRASS_TABLE = 'bible_grass';

const BIBLE_SEARCH_INFO_KEY = 'bibleSearchInfo';
const APP_THEME_KEY = 'appTheme';
const APP_LANGUAGE_KEY = 'appLanguage';
const ACTIVE_DATA_USER_ID_KEY = 'activeDataUserId';
const PENDING_NAVIGATION_KEY = 'pendingBibleNavigation';
const LAST_AUTO_SYNC_AT_KEY = 'lastAutoSyncAt';
const POINT_TOTAL_KEY = 'pointTotal';
const POINT_CLAIMED_STEP_UNITS_KEY = 'pointClaimedStepUnitsByDate';
const GRASS_COLOR_THEME_KEY = 'grassColorTheme';
const STEP_REWARD_USED_DATE_KEY = 'stepRewardUsedDate';
const GRASS_META_ROW_DATE = '__meta__';

const PERSISTED_SLICE_KEYS = ['appState', 'favorites', 'memos', 'plans', 'prayers', 'grassData'] as const;

export type PersistedSliceKey = (typeof PERSISTED_SLICE_KEYS)[number];

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'ko' | 'en';
export type GrassColorTheme =
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'sky';

export type GrassDayEntry = {
  bookCode: string;
  readChapter: number[];
};

export type GrassDayValue = {
  date: string;
  data: GrassDayEntry[];
  fillYn: boolean;
};

export type GrassDataMap = Record<string, GrassDayValue>;

type PersistedMemoRecord = {
  clientId: string;
  title: string;
  content: string;
  verseText: string;
  createdAt: string;
  bookCode?: string;
  chapter?: number;
  verseNumbers?: number[];
};

type PersistedPrayerContent = {
  clientId: string;
  content: string;
  registeredAt: string;
};

type PersistedPrayerRecord = {
  clientId: string;
  requester: string;
  target: string;
  createdAt: string;
  contents: PersistedPrayerContent[];
};

type PersistedPlanRecord = {
  clientId: string;
  planName: string;
  startDate: string;
  endDate: string;
  totalReadCount: number;
  currentReadCount: number;
  goalPercent: number;
  readCountPerDay: number;
  restDay: number;
  goalStatus: GoalStatus;
  selectedBookCodes: string[];
  createdAt: string;
  updatedAt: string;
};

export type PersistedStateSnapshot = {
  theme: AppTheme;
  appLanguage: AppLanguage;
  bible: BibleSearchInfo;
  favorites: FavoriteVerseRecord[];
  memos: PersistedMemoRecord[];
  prayers: PersistedPrayerRecord[];
  plans: PersistedPlanRecord[];
  grassData: GrassDataMap;
  grassTheme: GrassColorTheme;
  stepRewardUsedDate: string | null;
};

type StateRecord = {
  app_theme: string | null;
  app_language: string | null;
  bible_search_info: unknown;
};

type FavoriteRow = {
  book_code: string;
  chapter: number;
  verse: number;
  verse_text: string | null;
  created_at: string | null;
};

type LocalMemoRow = {
  id: number;
  client_id: string | null;
  title: string | null;
  content: string | null;
  verse_text: string | null;
  created_at: string | null;
};

type LocalMemoVerseRow = {
  memo_id: number;
  book_code: string;
  chapter: number;
  verse: number;
};

type LocalPlanRow = {
  id: number;
  client_id: string | null;
  plan_name: string | null;
  start_date: string | null;
  end_date: string | null;
  total_read_count: number | null;
  current_read_count: number | null;
  goal_percent: number | null;
  read_count_per_day: number | null;
  rest_day: number | null;
  goal_status: unknown;
  selected_book_codes: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type LocalPrayerRow = {
  id: number;
  client_id: string | null;
  requester: string | null;
  target: string | null;
  created_at: string | null;
};

type LocalPrayerContentRow = {
  id: number;
  client_id: string | null;
  prayer_id: number;
  content: string | null;
  registered_at: string | null;
};

type RemotePlanRow = {
  id: number;
  client_id: string | null;
  plan_name: string | null;
  start_date: string | null;
  end_date: string | null;
  total_read_count: number | null;
  current_read_count: number | null;
  goal_percent: number | null;
  read_count_per_day: number | null;
  rest_day: number | null;
  goal_status: unknown;
  selected_book_codes: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type RemotePrayerRow = {
  id: number;
  client_id: string | null;
  requester: string | null;
  target: string | null;
  created_at: string | null;
};

type RemotePrayerContentRow = {
  id: number;
  client_id: string | null;
  prayer_id: number;
  content: string | null;
  registered_at: string | null;
};

type GrassRow = {
  date: string;
  data: unknown;
};

type SupabaseLikeError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

type ResetOptions = {
  preserveTheme?: AppTheme;
  preserveAppLanguage?: AppLanguage;
};

const DEFAULT_BIBLE_STATE: BibleSearchInfo = {
  bookCode: 'genesis',
  chapter: 1,
  primaryLang: 'ko',
  secondaryLang: 'en',
  dualLang: false,
  fontScale: 1,
};

const DEFAULT_STATE: PersistedStateSnapshot = {
  theme: 'light',
  appLanguage: 'ko',
  bible: DEFAULT_BIBLE_STATE,
  favorites: [],
  memos: [],
  prayers: [],
  plans: [],
  grassData: {},
  grassTheme: 'green',
  stepRewardUsedDate: null,
};

let persistWriteQueue: Promise<void> = Promise.resolve();

function toErrorMessagePart(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeSupabaseError(error: unknown): Error {
  if (error instanceof Error) return error;

  if (error && typeof error === 'object') {
    const candidate = error as SupabaseLikeError;
    const message = toErrorMessagePart(candidate.message);
    const details = toErrorMessagePart(candidate.details);
    const hint = toErrorMessagePart(candidate.hint);
    const parts = [message, details, hint].filter((value): value is string => Boolean(value));
    if (parts.length > 0) {
      return new Error(parts.join(' | '));
    }
  }

  return new Error('SUPABASE_DATA_SYNC_FAILED');
}

function throwSupabaseError(error: unknown): never {
  throw normalizeSupabaseError(error);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'ko' || value === 'en';
}

function isGrassTheme(value: unknown): value is GrassColorTheme {
  return (
    value === 'green' ||
    value === 'yellow' ||
    value === 'orange' ||
    value === 'red' ||
    value === 'blue' ||
    value === 'purple' ||
    value === 'sky'
  );
}

function parseJsonText<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return (JSON.parse(value) as T) ?? fallback;
    } catch {
      return fallback;
    }
  }

  if (value == null) return fallback;
  return value as T;
}

function normalizeBibleState(raw: unknown, fallback: BibleSearchInfo): BibleSearchInfo {
  if (!raw || typeof raw !== 'object') return fallback;

  const value = raw as Partial<BibleSearchInfo>;
  const fontScale = toNumber(value.fontScale, fallback.fontScale);
  return {
    bookCode: typeof value.bookCode === 'string' ? value.bookCode : fallback.bookCode,
    chapter: Math.max(1, Math.floor(toNumber(value.chapter, fallback.chapter))),
    primaryLang:
      value.primaryLang === 'ko' || value.primaryLang === 'en' || value.primaryLang === 'de'
        ? value.primaryLang
        : fallback.primaryLang,
    secondaryLang:
      value.secondaryLang === 'ko' || value.secondaryLang === 'en' || value.secondaryLang === 'de'
        ? value.secondaryLang
        : fallback.secondaryLang,
    dualLang: value.dualLang === true,
    fontScale: Math.max(0.8, Math.min(1.4, fontScale)),
  };
}

function normalizeGrassDayValue(date: string, raw: unknown): GrassDayValue {
  const parsed = parseJsonText<unknown>(raw, []);

  if (Array.isArray(parsed)) {
    return {
      date,
      data: parsed as GrassDayEntry[],
      fillYn: false,
    };
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const row = parsed as { date?: unknown; data?: unknown; fillYn?: unknown };
    return {
      date: typeof row.date === 'string' ? row.date : date,
      data: Array.isArray(row.data) ? (row.data as GrassDayEntry[]) : [],
      fillYn: row.fillYn === true,
    };
  }

  return {
    date,
    data: [],
    fillYn: false,
  };
}

function normalizeGoalStatus(raw: unknown): GoalStatus {
  const parsed = parseJsonText<GoalStatus>(raw, createEmptyGoalStatus());
  return BIBLE_BOOKS.map((book, bookIndex) => {
    const source = Array.isArray(parsed[bookIndex]) ? parsed[bookIndex] : [];
    return Array.from({ length: book.maxChapter }, (_entry, chapterIndex) => {
      return source[chapterIndex] === 1 ? 1 : 0;
    });
  });
}

function buildPlanSnapshot(input: {
  clientId: string;
  planName: string;
  startDate: string;
  endDate: string;
  goalStatus: GoalStatus;
  selectedBookCodes: string[];
  createdAt: string;
  updatedAt: string;
}): PersistedPlanRecord {
  const computed = recalcPlanFields(input.goalStatus, input.selectedBookCodes, input.endDate);
  return {
    clientId: input.clientId,
    planName: input.planName,
    startDate: input.startDate,
    endDate: input.endDate,
    goalStatus: input.goalStatus,
    selectedBookCodes: input.selectedBookCodes,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    ...computed,
  };
}

function createInitialSnapshot(overrides?: Partial<PersistedStateSnapshot>): PersistedStateSnapshot {
  return {
    ...DEFAULT_STATE,
    ...overrides,
    bible: {
      ...DEFAULT_BIBLE_STATE,
      ...overrides?.bible,
    },
    favorites: overrides?.favorites ? overrides.favorites.map((item) => ({ ...item })) : [],
    memos: overrides?.memos
      ? overrides.memos.map((item) => ({
          ...item,
          ...(item.verseNumbers ? { verseNumbers: [...item.verseNumbers] } : {}),
        }))
      : [],
    prayers: overrides?.prayers
      ? overrides.prayers.map((item) => ({
          ...item,
          contents: item.contents.map((content) => ({ ...content })),
        }))
      : [],
    plans: overrides?.plans
      ? overrides.plans.map((item) => ({
          ...item,
          goalStatus: item.goalStatus.map((chapterStatus) => [...chapterStatus]),
          selectedBookCodes: [...item.selectedBookCodes],
        }))
      : [],
    grassData: overrides?.grassData
      ? Object.fromEntries(
          Object.entries(overrides.grassData).map(([date, value]) => [
            date,
            {
              date: value.date,
              fillYn: value.fillYn,
              data: value.data.map((entry) => ({
                bookCode: entry.bookCode,
                readChapter: [...entry.readChapter],
              })),
            },
          ]),
        )
      : {},
  };
}

async function getBibleStateValue(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${BIBLE_STATE_TABLE} WHERE key = ?`,
    key,
  );
  return row?.value ?? null;
}

async function setBibleStateValue(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${BIBLE_STATE_TABLE} (key, value) VALUES (?, ?)`,
    key,
    value,
  );
}

async function readLocalTheme(db: SQLiteDatabase): Promise<AppTheme> {
  const value = await getBibleStateValue(db, APP_THEME_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

async function readLocalAppLanguage(db: SQLiteDatabase): Promise<AppLanguage> {
  const value = await getBibleStateValue(db, APP_LANGUAGE_KEY);
  return isAppLanguage(value) ? value : DEFAULT_STATE.appLanguage;
}

async function readLocalBibleState(db: SQLiteDatabase): Promise<BibleSearchInfo> {
  const value = await getBibleStateValue(db, BIBLE_SEARCH_INFO_KEY);
  return normalizeBibleState(value ? parseJsonText(value, DEFAULT_BIBLE_STATE) : null, DEFAULT_BIBLE_STATE);
}

async function readLocalGrassData(db: SQLiteDatabase): Promise<GrassDataMap> {
  const rows = await db.getAllAsync<{ date: string; data: string }>(
    `SELECT date, data FROM ${GRASS_TABLE}`,
  );

  return Object.fromEntries(
    rows.map((row) => [row.date, normalizeGrassDayValue(row.date, row.data)]),
  );
}

async function readLocalFavorites(db: SQLiteDatabase): Promise<FavoriteVerseRecord[]> {
  const rows = await db.getAllAsync<FavoriteRow>(
    `SELECT book_code, chapter, verse, verse_text, created_at FROM ${FAVORITES_TABLE} ORDER BY created_at DESC, rowid DESC`,
  );

  return rows.map((row) => ({
    bookCode: row.book_code,
    chapter: Math.max(1, Math.floor(toNumber(row.chapter, 1))),
    verse: Math.max(1, Math.floor(toNumber(row.verse, 1))),
    verseText: row.verse_text ?? '',
    createdAt: row.created_at ?? '',
  }));
}

async function readLocalMemos(db: SQLiteDatabase): Promise<PersistedMemoRecord[]> {
  const [memoRows, memoVerseRows] = await Promise.all([
    db.getAllAsync<LocalMemoRow>(
      `SELECT id, client_id, title, content, verse_text, created_at FROM ${MEMOS_TABLE} ORDER BY created_at DESC, id DESC`,
    ),
    db.getAllAsync<LocalMemoVerseRow>(
      `SELECT memo_id, book_code, chapter, verse FROM ${MEMO_VERSES_TABLE}`,
    ),
  ]);

  const memoVerseMap = new Map<number, LocalMemoVerseRow[]>();
  for (const row of memoVerseRows) {
    const existing = memoVerseMap.get(row.memo_id);
    if (existing) existing.push(row);
    else memoVerseMap.set(row.memo_id, [row]);
  }

  return memoRows.map((row) => {
    const memo: PersistedMemoRecord = {
      clientId: row.client_id?.trim() || `memo-${row.id}`,
      title: row.title ?? '',
      content: row.content ?? '',
      verseText: row.verse_text ?? '',
      createdAt: row.created_at ?? '',
    };

    const verses = [...(memoVerseMap.get(row.id) ?? [])].sort((left, right) => left.verse - right.verse);
    if (!verses.length) return memo;

    const first = verses[0];
    const sameLocation = verses.every(
      (item) => item.book_code === first.book_code && item.chapter === first.chapter,
    );
    if (!sameLocation) return memo;

    return {
      ...memo,
      bookCode: first.book_code,
      chapter: first.chapter,
      verseNumbers: verses.map((item) => item.verse),
    };
  });
}

async function readLocalPlans(db: SQLiteDatabase): Promise<PersistedPlanRecord[]> {
  const rows = await db.getAllAsync<LocalPlanRow>(
    `SELECT id, client_id, plan_name, start_date, end_date, total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day, goal_status, selected_book_codes, created_at, updated_at FROM ${PLANS_TABLE} ORDER BY created_at DESC, id DESC`,
  );

  return rows.map((row) => {
    const goalStatus = normalizeGoalStatus(row.goal_status);
    const selectedBookCodes = parseJsonText<string[]>(row.selected_book_codes, []).filter(
      (value): value is string => typeof value === 'string',
    );

    return buildPlanSnapshot({
      clientId: row.client_id?.trim() || `plan-${row.id}`,
      planName: row.plan_name ?? '',
      startDate: row.start_date ?? '',
      endDate: row.end_date ?? '',
      goalStatus,
      selectedBookCodes,
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? row.created_at ?? '',
    });
  });
}

async function readLocalPrayers(db: SQLiteDatabase): Promise<PersistedPrayerRecord[]> {
  const [prayerRows, contentRows] = await Promise.all([
    db.getAllAsync<LocalPrayerRow>(
      `SELECT id, client_id, requester, target, created_at FROM ${PRAYERS_TABLE} ORDER BY created_at DESC, id DESC`,
    ),
    db.getAllAsync<LocalPrayerContentRow>(
      `SELECT id, client_id, prayer_id, content, registered_at FROM ${PRAYER_CONTENTS_TABLE} ORDER BY registered_at DESC, id DESC`,
    ),
  ]);

  const contentMap = new Map<number, PersistedPrayerContent[]>();
  for (const row of contentRows) {
    const content: PersistedPrayerContent = {
      clientId: row.client_id?.trim() || `prayer-content-${row.id}`,
      content: row.content ?? '',
      registeredAt: row.registered_at ?? '',
    };
    const existing = contentMap.get(row.prayer_id);
    if (existing) existing.push(content);
    else contentMap.set(row.prayer_id, [content]);
  }

  return prayerRows.map((row) => ({
    clientId: row.client_id?.trim() || `prayer-${row.id}`,
    requester: row.requester ?? '',
    target: row.target ?? '',
    createdAt: row.created_at ?? '',
    contents: [...(contentMap.get(row.id) ?? [])].sort((left, right) =>
      right.registeredAt.localeCompare(left.registeredAt),
    ),
  }));
}

async function readLocalGrassTheme(db: SQLiteDatabase): Promise<GrassColorTheme> {
  const value = await getBibleStateValue(db, GRASS_COLOR_THEME_KEY);
  return isGrassTheme(value) ? value : DEFAULT_STATE.grassTheme;
}

async function readLocalStepRewardUsedDate(db: SQLiteDatabase): Promise<string | null> {
  return await getBibleStateValue(db, STEP_REWARD_USED_DATE_KEY);
}

export async function getLocalDataOwnerUserId(db: SQLiteDatabase): Promise<string | null> {
  return await getBibleStateValue(db, ACTIVE_DATA_USER_ID_KEY);
}

export async function getLocalPersistedSnapshot(db: SQLiteDatabase): Promise<PersistedStateSnapshot> {
  const [theme, appLanguage, bible, favorites, memos, plans, prayers, grassData, grassTheme, stepRewardUsedDate] =
    await Promise.all([
      readLocalTheme(db),
      readLocalAppLanguage(db),
      readLocalBibleState(db),
      readLocalFavorites(db),
      readLocalMemos(db),
      readLocalPlans(db),
      readLocalPrayers(db),
      readLocalGrassData(db),
      readLocalGrassTheme(db),
      readLocalStepRewardUsedDate(db),
    ]);

  return createInitialSnapshot({
    theme,
    appLanguage,
    bible,
    favorites,
    memos,
    plans,
    prayers,
    grassData,
    grassTheme,
    stepRewardUsedDate,
  });
}

function buildStateRecord(userId: string, state: PersistedStateSnapshot) {
  return {
    user_id: userId,
    app_theme: state.theme,
    app_language: state.appLanguage,
    bible_search_info: state.bible,
    updated_at: new Date().toISOString(),
  };
}

async function replaceStateRecord(userId: string, state: PersistedStateSnapshot): Promise<void> {
  const supabase = createSupabaseClient();
  const payload = buildStateRecord(userId, state);

  const { error } = await supabase.from(USER_BIBLE_STATE_TABLE).upsert(payload, {
    onConflict: 'user_id',
  });
  if (error) throwSupabaseError(error);
}

async function replaceFavorites(userId: string, favorites: FavoriteVerseRecord[]): Promise<void> {
  const supabase = createSupabaseClient();
  const { error: deleteError } = await supabase.from(USER_FAVORITES_TABLE).delete().eq('user_id', userId);
  if (deleteError) throwSupabaseError(deleteError);

  if (!favorites.length) return;

  const payload = favorites.map((favorite) => ({
    user_id: userId,
    book_code: favorite.bookCode,
    chapter: favorite.chapter,
    verse: favorite.verse,
    verse_text: favorite.verseText,
    created_at: favorite.createdAt,
  }));

  const { error } = await supabase.from(USER_FAVORITES_TABLE).insert(payload);
  if (error) throwSupabaseError(error);
}

async function replaceMemos(userId: string, memos: PersistedMemoRecord[]): Promise<void> {
  const supabase = createSupabaseClient();

  const { error: deleteMemoVersesError } = await supabase.from(USER_MEMO_VERSES_TABLE).delete().eq('user_id', userId);
  if (deleteMemoVersesError) throwSupabaseError(deleteMemoVersesError);

  const { error: deleteMemosError } = await supabase.from(USER_MEMOS_TABLE).delete().eq('user_id', userId);
  if (deleteMemosError) throwSupabaseError(deleteMemosError);

  if (!memos.length) return;

  const memoIdMap = new Map<string, number>();

  for (const memo of memos) {
    const { data, error } = await supabase
      .from(USER_MEMOS_TABLE)
      .insert({
        user_id: userId,
        client_id: memo.clientId,
        title: memo.title,
        content: memo.content,
        verse_text: memo.verseText,
        created_at: memo.createdAt,
      })
      .select('id')
      .single();

    if (error) throwSupabaseError(error);
    memoIdMap.set(memo.clientId, toNumber(data?.id));
  }

  const versePayload = memos.flatMap((memo) => {
    if (!memo.bookCode || typeof memo.chapter !== 'number' || !memo.verseNumbers?.length) {
      return [];
    }

    const memoId = memoIdMap.get(memo.clientId);
    if (!memoId) return [];

    return memo.verseNumbers.map((verse) => ({
      user_id: userId,
      memo_id: memoId,
      book_code: memo.bookCode!,
      chapter: memo.chapter!,
      verse,
    }));
  });

  if (!versePayload.length) return;

  const { error } = await supabase.from(USER_MEMO_VERSES_TABLE).insert(versePayload);
  if (error) throwSupabaseError(error);
}

async function replacePlans(userId: string, plans: PersistedPlanRecord[]): Promise<void> {
  const supabase = createSupabaseClient();
  const { error: deleteError } = await supabase.from(USER_PLANS_TABLE).delete().eq('user_id', userId).is('church_id', null);
  if (deleteError) throwSupabaseError(deleteError);

  if (!plans.length) return;

  const payload = plans.map((plan) => ({
    user_id: userId,
    client_id: plan.clientId,
    plan_name: plan.planName,
    start_date: plan.startDate,
    end_date: plan.endDate,
    total_read_count: plan.totalReadCount,
    current_read_count: plan.currentReadCount,
    goal_percent: plan.goalPercent,
    read_count_per_day: plan.readCountPerDay,
    rest_day: plan.restDay,
    goal_status: plan.goalStatus,
    selected_book_codes: plan.selectedBookCodes,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
    church_id: null,
    team_id: null,
  }));

  const { error } = await supabase.from(USER_PLANS_TABLE).insert(payload);
  if (error) throwSupabaseError(error);
}

async function replacePrayers(userId: string, prayers: PersistedPrayerRecord[]): Promise<void> {
  const supabase = createSupabaseClient();

  const { data: existingPrayers, error: existingPrayersError } = await supabase
    .from(USER_PRAYERS_TABLE)
    .select('id')
    .eq('user_id', userId);
  if (existingPrayersError) throwSupabaseError(existingPrayersError);

  const existingPrayerIds = (existingPrayers ?? [])
    .map((row) => toNumber((row as { id?: unknown }).id, NaN))
    .filter((value) => Number.isFinite(value));

  if (existingPrayerIds.length > 0) {
    const { error: deleteContentsError } = await supabase
      .from(USER_PRAYER_CONTENTS_TABLE)
      .delete()
      .in('prayer_id', existingPrayerIds);
    if (deleteContentsError) throwSupabaseError(deleteContentsError);
  }

  const { error: deletePrayersError } = await supabase.from(USER_PRAYERS_TABLE).delete().eq('user_id', userId);
  if (deletePrayersError) throwSupabaseError(deletePrayersError);

  if (!prayers.length) return;

  const prayerIdMap = new Map<string, number>();

  for (const prayer of prayers) {
    const { data, error } = await supabase
      .from(USER_PRAYERS_TABLE)
      .insert({
        user_id: userId,
        client_id: prayer.clientId,
        requester: prayer.requester,
        target: prayer.target,
        created_at: prayer.createdAt,
      })
      .select('id')
      .single();

    if (error) throwSupabaseError(error);
    prayerIdMap.set(prayer.clientId, toNumber(data?.id));
  }

  const contentsPayload = prayers.flatMap((prayer) => {
    const prayerId = prayerIdMap.get(prayer.clientId);
    if (!prayerId) return [];

    return prayer.contents.map((content) => ({
      prayer_id: prayerId,
      client_id: content.clientId,
      content: content.content,
      registered_at: content.registeredAt,
    }));
  });

  if (!contentsPayload.length) return;

  const { error } = await supabase.from(USER_PRAYER_CONTENTS_TABLE).insert(contentsPayload);
  if (error) throwSupabaseError(error);
}

async function replaceGrass(userId: string, state: PersistedStateSnapshot): Promise<void> {
  const supabase = createSupabaseClient();
  const { error: deleteError } = await supabase.from(USER_GRASS_TABLE).delete().eq('user_id', userId);
  if (deleteError) throwSupabaseError(deleteError);

  const payload: Array<{ user_id: string; date: string; data: unknown }> = Object.values(state.grassData).map(
    (day) => ({
      user_id: userId,
      date: day.date,
      data: {
        date: day.date,
        data: day.data,
        fillYn: day.fillYn,
      },
    }),
  );

  payload.push({
    user_id: userId,
    date: GRASS_META_ROW_DATE,
    data: {
      type: 'meta',
      grassTheme: state.grassTheme,
      stepRewardUsedDate: state.stepRewardUsedDate,
    },
  });

  const { error } = await supabase.from(USER_GRASS_TABLE).insert(payload);
  if (error) throwSupabaseError(error);
}

async function savePersistedSlicesToSupabase(
  userId: string,
  state: PersistedStateSnapshot,
  slices: PersistedSliceKey[],
): Promise<void> {
  for (const slice of slices) {
    switch (slice) {
      case 'appState':
        await replaceStateRecord(userId, state);
        break;
      case 'favorites':
        await replaceFavorites(userId, state.favorites);
        break;
      case 'memos':
        await replaceMemos(userId, state.memos);
        break;
      case 'plans':
        await replacePlans(userId, state.plans);
        break;
      case 'prayers':
        await replacePrayers(userId, state.prayers);
        break;
      case 'grassData':
        await replaceGrass(userId, state);
        break;
      default:
        break;
    }
  }
}

export async function savePersistedStateToSupabase(
  userId: string,
  state: PersistedStateSnapshot,
): Promise<void> {
  await savePersistedSlicesToSupabase(userId, state, [...PERSISTED_SLICE_KEYS]);
}

async function hasRemoteRows(userId: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  const checks = await Promise.all([
    supabase.from(USER_BIBLE_STATE_TABLE).select('user_id').eq('user_id', userId).limit(1),
    supabase.from(USER_FAVORITES_TABLE).select('verse').eq('user_id', userId).limit(1),
    supabase.from(USER_MEMOS_TABLE).select('id').eq('user_id', userId).limit(1),
    supabase.from(USER_PLANS_TABLE).select('id').eq('user_id', userId).is('church_id', null).limit(1),
    supabase.from(USER_PRAYERS_TABLE).select('id').eq('user_id', userId).limit(1),
    supabase.from(USER_GRASS_TABLE).select('date').eq('user_id', userId).limit(1),
  ]);

  for (const result of checks) {
    if (result.error) throwSupabaseError(result.error);
    if ((result.data?.length ?? 0) > 0) return true;
  }

  return false;
}

export async function loadPersistedStateFromSupabase(
  userId: string,
): Promise<PersistedStateSnapshot> {
  const supabase = createSupabaseClient();
  const [
    stateResult,
    favoritesResult,
    memosResult,
    memoVersesResult,
    plansResult,
    prayersResult,
    grassResult,
  ] = await Promise.all([
    supabase
      .from(USER_BIBLE_STATE_TABLE)
      .select('app_theme, app_language, bible_search_info')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from(USER_FAVORITES_TABLE)
      .select('book_code, chapter, verse, verse_text, created_at')
      .eq('user_id', userId),
    supabase
      .from(USER_MEMOS_TABLE)
      .select('id, client_id, title, content, verse_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase
      .from(USER_MEMO_VERSES_TABLE)
      .select('memo_id, book_code, chapter, verse')
      .eq('user_id', userId),
    supabase
      .from(USER_PLANS_TABLE)
      .select(
        'id, client_id, plan_name, start_date, end_date, total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day, goal_status, selected_book_codes, created_at, updated_at',
      )
      .eq('user_id', userId)
      .is('church_id', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase
      .from(USER_PRAYERS_TABLE)
      .select('id, client_id, requester, target, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from(USER_GRASS_TABLE).select('date, data').eq('user_id', userId),
  ]);

  for (const result of [
    stateResult,
    favoritesResult,
    memosResult,
    memoVersesResult,
    plansResult,
    prayersResult,
    grassResult,
  ]) {
    if (result.error) throwSupabaseError(result.error);
  }

  const stateRow = ((stateResult.data ?? null) as StateRecord | null) ?? null;
  const favoritesRows = (favoritesResult.data ?? []) as FavoriteRow[];
  const memoRows = (memosResult.data ?? []) as LocalMemoRow[];
  const memoVerseRows = (memoVersesResult.data ?? []) as LocalMemoVerseRow[];
  const planRows = (plansResult.data ?? []) as RemotePlanRow[];
  const prayerRows = (prayersResult.data ?? []) as RemotePrayerRow[];
  const grassRows = (grassResult.data ?? []) as GrassRow[];

  const memoVerseMap = new Map<number, LocalMemoVerseRow[]>();
  for (const row of memoVerseRows) {
    const existing = memoVerseMap.get(row.memo_id);
    if (existing) existing.push(row);
    else memoVerseMap.set(row.memo_id, [row]);
  }

  const prayersIds = [...new Set(prayerRows.map((row) => row.id).filter((value) => Number.isFinite(value)))];
  let prayerContentRows: RemotePrayerContentRow[] = [];

  if (prayersIds.length > 0) {
    const { data, error } = await supabase
      .from(USER_PRAYER_CONTENTS_TABLE)
      .select('id, client_id, prayer_id, content, registered_at')
      .in('prayer_id', prayersIds)
      .order('registered_at', { ascending: false })
      .order('id', { ascending: false });

    if (error) throwSupabaseError(error);
    prayerContentRows = (data ?? []) as RemotePrayerContentRow[];
  }

  const prayerContentMap = new Map<number, PersistedPrayerContent[]>();
  for (const row of prayerContentRows) {
    const content: PersistedPrayerContent = {
      clientId: row.client_id?.trim() || `prayer-content-${row.id}`,
      content: row.content ?? '',
      registeredAt: row.registered_at ?? '',
    };
    const existing = prayerContentMap.get(row.prayer_id);
    if (existing) existing.push(content);
    else prayerContentMap.set(row.prayer_id, [content]);
  }

  const metaRow = grassRows.find((row) => row.date === GRASS_META_ROW_DATE);
  const meta =
    metaRow && typeof metaRow.data === 'object' && metaRow.data !== null
      ? (metaRow.data as { grassTheme?: unknown; stepRewardUsedDate?: unknown })
      : null;

  return createInitialSnapshot({
    theme: stateRow?.app_theme === 'dark' ? 'dark' : 'light',
    appLanguage: isAppLanguage(stateRow?.app_language) ? stateRow.app_language : DEFAULT_STATE.appLanguage,
    bible: normalizeBibleState(stateRow?.bible_search_info, DEFAULT_BIBLE_STATE),
    favorites: favoritesRows.map((row) => ({
      bookCode: row.book_code,
      chapter: Math.max(1, Math.floor(toNumber(row.chapter, 1))),
      verse: Math.max(1, Math.floor(toNumber(row.verse, 1))),
      verseText: row.verse_text ?? '',
      createdAt: row.created_at ?? '',
    })),
    memos: memoRows.map((row) => {
      const memo: PersistedMemoRecord = {
        clientId: row.client_id?.trim() || `memo-${row.id}`,
        title: row.title ?? '',
        content: row.content ?? '',
        verseText: row.verse_text ?? '',
        createdAt: row.created_at ?? '',
      };

      const verses = [...(memoVerseMap.get(row.id) ?? [])].sort((left, right) => left.verse - right.verse);
      if (!verses.length) return memo;

      const first = verses[0];
      const sameLocation = verses.every(
        (item) => item.book_code === first.book_code && item.chapter === first.chapter,
      );
      if (!sameLocation) return memo;

      return {
        ...memo,
        bookCode: first.book_code,
        chapter: first.chapter,
        verseNumbers: verses.map((item) => item.verse),
      };
    }),
    plans: planRows.map((row) => {
      const goalStatus = normalizeGoalStatus(row.goal_status);
      const selectedBookCodes = parseJsonText<string[]>(row.selected_book_codes, []).filter(
        (value): value is string => typeof value === 'string',
      );

      return buildPlanSnapshot({
        clientId: row.client_id?.trim() || `plan-${row.id}`,
        planName: row.plan_name ?? '',
        startDate: row.start_date ?? '',
        endDate: row.end_date ?? '',
        goalStatus,
        selectedBookCodes,
        createdAt: row.created_at ?? '',
        updatedAt: row.updated_at ?? row.created_at ?? '',
      });
    }),
    prayers: prayerRows.map((row) => ({
      clientId: row.client_id?.trim() || `prayer-${row.id}`,
      requester: row.requester ?? '',
      target: row.target ?? '',
      createdAt: row.created_at ?? '',
      contents: [...(prayerContentMap.get(row.id) ?? [])].sort((left, right) =>
        right.registeredAt.localeCompare(left.registeredAt),
      ),
    })),
    grassData: Object.fromEntries(
      grassRows
        .filter((row) => row.date !== GRASS_META_ROW_DATE)
        .map((row) => [row.date, normalizeGrassDayValue(row.date, row.data)]),
    ),
    grassTheme: isGrassTheme(meta?.grassTheme) ? meta.grassTheme : DEFAULT_STATE.grassTheme,
    stepRewardUsedDate: typeof meta?.stepRewardUsedDate === 'string' ? meta.stepRewardUsedDate : null,
  });
}

async function replaceLocalPersistedState(
  db: SQLiteDatabase,
  state: PersistedStateSnapshot,
): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;');

  try {
    await db.runAsync(`DELETE FROM ${FAVORITES_TABLE}`);
    await db.runAsync(`DELETE FROM ${MEMO_VERSES_TABLE}`);
    await db.runAsync(`DELETE FROM ${MEMOS_TABLE}`);
    await db.runAsync(`DELETE FROM ${PRAYER_CONTENTS_TABLE}`);
    await db.runAsync(`DELETE FROM ${PRAYERS_TABLE}`);
    await db.runAsync(`DELETE FROM ${PLANS_TABLE}`);
    await db.runAsync(`DELETE FROM ${GRASS_TABLE}`);

    const keysToDelete = [
      BIBLE_SEARCH_INFO_KEY,
      APP_THEME_KEY,
      APP_LANGUAGE_KEY,
      ACTIVE_DATA_USER_ID_KEY,
      PENDING_NAVIGATION_KEY,
      LAST_AUTO_SYNC_AT_KEY,
      POINT_TOTAL_KEY,
      POINT_CLAIMED_STEP_UNITS_KEY,
      GRASS_COLOR_THEME_KEY,
      STEP_REWARD_USED_DATE_KEY,
    ];

    for (const key of keysToDelete) {
      await db.runAsync(`DELETE FROM ${BIBLE_STATE_TABLE} WHERE key = ?`, key);
    }

    await setBibleStateValue(db, APP_THEME_KEY, state.theme);
    await setBibleStateValue(db, APP_LANGUAGE_KEY, state.appLanguage);
    await setBibleStateValue(db, BIBLE_SEARCH_INFO_KEY, JSON.stringify(state.bible));
    await setBibleStateValue(db, GRASS_COLOR_THEME_KEY, state.grassTheme);
    if (state.stepRewardUsedDate) {
      await setBibleStateValue(db, STEP_REWARD_USED_DATE_KEY, state.stepRewardUsedDate);
    }

    for (const favorite of state.favorites) {
      await db.runAsync(
        `INSERT INTO ${FAVORITES_TABLE} (book_code, chapter, verse, verse_text, created_at) VALUES (?, ?, ?, ?, ?)`,
        favorite.bookCode,
        favorite.chapter,
        favorite.verse,
        favorite.verseText,
        favorite.createdAt,
      );
    }

    for (const memo of state.memos) {
      const result = await db.runAsync(
        `INSERT INTO ${MEMOS_TABLE} (client_id, title, content, verse_text, created_at) VALUES (?, ?, ?, ?, ?)`,
        memo.clientId,
        memo.title,
        memo.content,
        memo.verseText,
        memo.createdAt,
      );
      const memoId = Number(result.lastInsertRowId);
      if (!memoId || !memo.bookCode || typeof memo.chapter !== 'number' || !memo.verseNumbers?.length) {
        continue;
      }

      for (const verse of memo.verseNumbers) {
        await db.runAsync(
          `INSERT INTO ${MEMO_VERSES_TABLE} (memo_id, book_code, chapter, verse) VALUES (?, ?, ?, ?)`,
          memoId,
          memo.bookCode,
          memo.chapter,
          verse,
        );
      }
    }

    for (const plan of state.plans) {
      const computed = recalcPlanFields(plan.goalStatus, plan.selectedBookCodes, plan.endDate);
      await db.runAsync(
        `INSERT INTO ${PLANS_TABLE} (
          client_id, plan_name, start_date, end_date,
          total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day,
          goal_status, selected_book_codes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        plan.clientId,
        plan.planName,
        plan.startDate,
        plan.endDate,
        computed.totalReadCount,
        computed.currentReadCount,
        computed.goalPercent,
        computed.readCountPerDay,
        computed.restDay,
        JSON.stringify(plan.goalStatus),
        JSON.stringify(plan.selectedBookCodes),
        plan.createdAt,
        plan.updatedAt,
      );
    }

    for (const prayer of state.prayers) {
      const result = await db.runAsync(
        `INSERT INTO ${PRAYERS_TABLE} (client_id, requester, target, created_at) VALUES (?, ?, ?, ?)`,
        prayer.clientId,
        prayer.requester,
        prayer.target,
        prayer.createdAt,
      );
      const prayerId = Number(result.lastInsertRowId);
      if (!prayerId) continue;

      for (const content of prayer.contents) {
        await db.runAsync(
          `INSERT INTO ${PRAYER_CONTENTS_TABLE} (client_id, prayer_id, content, registered_at) VALUES (?, ?, ?, ?)`,
          content.clientId,
          prayerId,
          content.content,
          content.registeredAt,
        );
      }
    }

    for (const day of Object.values(state.grassData)) {
      await db.runAsync(
        `INSERT INTO ${GRASS_TABLE} (date, data) VALUES (?, ?)`,
        day.date,
        JSON.stringify({
          date: day.date,
          data: day.data,
          fillYn: day.fillYn,
        }),
      );
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}

export async function bootstrapSupabaseUserData(
  db: SQLiteDatabase,
  userId: string,
): Promise<void> {
  const localSnapshot = await getLocalPersistedSnapshot(db);
  const remoteHasData = await hasRemoteRows(userId);

  if (!remoteHasData) {
    await savePersistedStateToSupabase(userId, localSnapshot);
  }

  const remoteSnapshot = await loadPersistedStateFromSupabase(userId);
  await replaceLocalPersistedState(db, remoteSnapshot);
  await setBibleStateValue(db, ACTIVE_DATA_USER_ID_KEY, userId);
}

export async function resetLocalPersistedState(
  db: SQLiteDatabase,
  options: ResetOptions = {},
): Promise<void> {
  const theme = options.preserveTheme ?? (await readLocalTheme(db));
  const appLanguage = options.preserveAppLanguage ?? (await readLocalAppLanguage(db));

  await replaceLocalPersistedState(
    db,
    createInitialSnapshot({
      theme,
      appLanguage,
    }),
  );
}

export function queuePersistedSlicesSave(
  db: SQLiteDatabase,
  slices: PersistedSliceKey[],
): Promise<void> {
  if (!getActiveUserId() || !slices.length || isSQLiteStateSyncPaused()) {
    return Promise.resolve();
  }

  const uniqueSlices = [...new Set(slices)];
  persistWriteQueue = persistWriteQueue
    .catch(() => {
      // Keep the queue usable after a previous failure.
    })
    .then(async () => {
      const userId = getActiveUserId();
      if (!userId || isSQLiteStateSyncPaused()) return;
      const snapshot = await getLocalPersistedSnapshot(db);
      await savePersistedSlicesToSupabase(userId, snapshot, uniqueSlices);
    })
    .catch((error) => {
      console.warn('Failed to synchronize SQLite state to Supabase.', error);
    });

  return persistWriteQueue;
}
