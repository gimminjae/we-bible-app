import { createId } from '@/lib/date';
import { getActiveUserId } from '@/lib/auth-state';
import { createSupabaseClient } from '@/lib/supabase-client';
import { queuePersistedSlicesSave } from '@/lib/sqlite-supabase-store';
import { bibleInfos } from '@/services/bible';
import type { SQLiteDatabase } from 'expo-sqlite';

const PLANS_TABLE = 'plans';

export const BIBLE_BOOKS = bibleInfos.filter((b) => b.bookSeq >= 1 && b.bookSeq <= 66);

export type GoalStatus = number[][];

export type PlanRecord = {
  id: number;
  planName: string;
  planDescription: string;
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

export type PlanListItem = {
  id: number;
  planName: string;
  planDescription: string;
  startDate: string;
  endDate: string;
  totalReadCount: number;
  currentReadCount: number;
  goalPercent: number;
  restDay: number;
  selectedBookCodes: string[];
};

export type PlanChapterSelectionItem = {
  id: number;
  planName: string;
  planDescription: string;
  startDate: string;
  endDate: string;
  totalReadCount: number;
  currentReadCount: number;
  goalPercent: number;
  currentChapterReadCount: number;
};

function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isDateWithinRange(date: string, startDate: string, endDate: string): boolean {
  if (!date || !startDate || !endDate) return false;
  return startDate <= date && date <= endDate;
}

export function calcTotalReadCount(selectedBookCodes: string[]): number {
  return selectedBookCodes.reduce((sum, code) => {
    const book = BIBLE_BOOKS.find((b) => b.bookCode === code);
    return sum + (book?.maxChapter ?? 0);
  }, 0);
}

export function calcCurrentReadCount(goalStatus: GoalStatus, selectedBookCodes: string[]): number {
  let count = 0;
  for (let i = 0; i < BIBLE_BOOKS.length; i++) {
    const book = BIBLE_BOOKS[i];
    if (!selectedBookCodes.includes(book.bookCode)) continue;
    const chapters = goalStatus[i] ?? [];
    count += countReadChapters(chapters);
  }
  return count;
}

export function calcRestDay(endDate: string): number {
  const today = new Date(todayString());
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function calcReadCountPerDay(
  totalReadCount: number,
  currentReadCount: number,
  restDay: number,
): number {
  const remaining = totalReadCount - currentReadCount;
  if (restDay <= 0 || remaining <= 0) return 0;
  return Math.round((remaining / restDay) * 100) / 100;
}

export function calcGoalPercent(totalReadCount: number, currentReadCount: number): number {
  if (totalReadCount <= 0) return 0;
  return Math.round((currentReadCount / totalReadCount) * 10000) / 100;
}

export function createEmptyGoalStatus(): GoalStatus {
  return BIBLE_BOOKS.map((b) => Array(b.maxChapter).fill(0));
}

export function normalizeChapterReadCount(value: unknown): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

export function isChapterRead(value: unknown): boolean {
  return normalizeChapterReadCount(value) > 0;
}

export function countReadChapters(chapters: number[]): number {
  return chapters.reduce((sum, chapter) => sum + (isChapterRead(chapter) ? 1 : 0), 0);
}

export function normalizeGoalStatus(raw: unknown): GoalStatus {
  const parsed =
    typeof raw === 'string'
      ? (() => {
          try {
            const value = JSON.parse(raw) as unknown;
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        })()
      : Array.isArray(raw)
        ? raw
        : [];
  return BIBLE_BOOKS.map((book, bookIndex) => {
    const source = Array.isArray(parsed[bookIndex]) ? parsed[bookIndex] : [];
    return Array.from({ length: book.maxChapter }, (_entry, chapterIndex) =>
      normalizeChapterReadCount(source[chapterIndex]),
    );
  });
}

function recalcAndUpdate(
  goalStatus: GoalStatus,
  selectedBookCodes: string[],
  endDate: string,
): {
  totalReadCount: number;
  currentReadCount: number;
  goalPercent: number;
  readCountPerDay: number;
  restDay: number;
} {
  const totalReadCount = calcTotalReadCount(selectedBookCodes);
  const currentReadCount = calcCurrentReadCount(goalStatus, selectedBookCodes);
  const restDay = calcRestDay(endDate);
  const readCountPerDay = calcReadCountPerDay(totalReadCount, currentReadCount, restDay);
  const goalPercent = calcGoalPercent(totalReadCount, currentReadCount);

  return {
    totalReadCount,
    currentReadCount,
    goalPercent,
    readCountPerDay,
    restDay,
  };
}

function parseJson<T>(value: unknown): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return [] as unknown as T;
    }
  }

  return (value as T) ?? ([] as unknown as T);
}

async function ensureLocalPlansTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${PLANS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT DEFAULT '',
      plan_name TEXT NOT NULL DEFAULT '',
      plan_description TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      total_read_count INTEGER NOT NULL DEFAULT 0,
      current_read_count INTEGER NOT NULL DEFAULT 0,
      goal_percent REAL NOT NULL DEFAULT 0,
      read_count_per_day REAL NOT NULL DEFAULT 0,
      rest_day INTEGER NOT NULL DEFAULT 0,
      goal_status TEXT NOT NULL DEFAULT '[]',
      selected_book_codes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${PLANS_TABLE})`);
  if (!info.some((r) => r.name === 'client_id')) {
    await db.runAsync(`ALTER TABLE ${PLANS_TABLE} ADD COLUMN client_id TEXT DEFAULT ''`);
  }
  if (!info.some((r) => r.name === 'plan_description')) {
    await db.runAsync(
      `ALTER TABLE ${PLANS_TABLE} ADD COLUMN plan_description TEXT NOT NULL DEFAULT ''`,
    );
  }
}

function toSupabaseError(error: unknown): Error {
  return error instanceof Error ? error : new Error('PLANS_REMOTE_ERROR');
}

type RemotePlanRow = {
  id?: unknown;
  plan_name?: unknown;
  plan_description?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  total_read_count?: unknown;
  current_read_count?: unknown;
  goal_percent?: unknown;
  read_count_per_day?: unknown;
  rest_day?: unknown;
  goal_status?: unknown;
  selected_book_codes?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

function normalizeRemotePlanToRecord(row: RemotePlanRow): PlanRecord {
  const endDate = String(row.end_date ?? '');
  const goalStatus = normalizeGoalStatus(row.goal_status);
  const selectedBookCodes = parseJson<string[]>(row.selected_book_codes).filter(
    (value): value is string => typeof value === 'string',
  );
  const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);

  return {
    id: Number(row.id ?? 0),
    planName: String(row.plan_name ?? ''),
    planDescription: String(row.plan_description ?? ''),
    startDate: String(row.start_date ?? ''),
    endDate,
    totalReadCount: computed.totalReadCount,
    currentReadCount: computed.currentReadCount,
    goalPercent: computed.goalPercent,
    readCountPerDay: computed.readCountPerDay,
    restDay: computed.restDay,
    goalStatus,
    selectedBookCodes,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

function normalizeRemotePlanToListItem(row: RemotePlanRow): PlanListItem {
  const record = normalizeRemotePlanToRecord(row);
  return {
    id: record.id,
    planName: record.planName,
    planDescription: record.planDescription,
    startDate: record.startDate,
    endDate: record.endDate,
    totalReadCount: record.totalReadCount,
    currentReadCount: record.currentReadCount,
    goalPercent: record.goalPercent,
    restDay: record.restDay,
    selectedBookCodes: record.selectedBookCodes,
  };
}

async function getRemotePlanRows(userId: string): Promise<RemotePlanRow[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from(PLANS_TABLE)
    .select(
      'id, plan_name, plan_description, start_date, end_date, total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day, goal_status, selected_book_codes, created_at, updated_at',
    )
    .eq('user_id', userId)
    .is('church_id', null)
    .order('id', { ascending: false });

  if (error) throw toSupabaseError(error);
  return (data ?? []) as RemotePlanRow[];
}

export async function initPlansTable(db: SQLiteDatabase): Promise<void> {
  if (getActiveUserId()) return;
  await ensureLocalPlansTable(db);
}

export async function addPlan(
  db: SQLiteDatabase,
  planName: string,
  planDescription: string,
  startDate: string,
  endDate: string,
  selectedBookCodes: string[],
): Promise<number> {
  const now = nowString();
  const goalStatus = createEmptyGoalStatus();
  const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);
  const clientId = createId();
  const userId = getActiveUserId();

  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(PLANS_TABLE)
      .insert({
        user_id: userId,
        client_id: clientId,
        plan_name: planName.trim(),
        plan_description: planDescription.trim(),
        start_date: startDate,
        end_date: endDate,
        total_read_count: computed.totalReadCount,
        current_read_count: computed.currentReadCount,
        goal_percent: computed.goalPercent,
        read_count_per_day: computed.readCountPerDay,
        rest_day: computed.restDay,
        goal_status: goalStatus,
        selected_book_codes: selectedBookCodes,
        created_at: now,
        updated_at: now,
        church_id: null,
        team_id: null,
      })
      .select('id')
      .single();

    if (error) throw toSupabaseError(error);
    return Number((data as { id?: unknown } | null)?.id ?? 0);
  }

  await ensureLocalPlansTable(db);
  const result = await db.runAsync(
    `INSERT INTO ${PLANS_TABLE} (
      client_id, plan_name, plan_description, start_date, end_date,
      total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day,
      goal_status, selected_book_codes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    clientId,
    planName.trim(),
    planDescription.trim(),
    startDate,
    endDate,
    computed.totalReadCount,
    computed.currentReadCount,
    computed.goalPercent,
    computed.readCountPerDay,
    computed.restDay,
    JSON.stringify(goalStatus),
    JSON.stringify(selectedBookCodes),
    now,
    now,
  );
  await queuePersistedSlicesSave(db, ['plans']);
  return Number(result.lastInsertRowId);
}

export async function getAllPlans(db: SQLiteDatabase): Promise<PlanListItem[]> {
  const userId = getActiveUserId();
  if (userId) {
    const rows = await getRemotePlanRows(userId);
    return rows.map(normalizeRemotePlanToListItem);
  }

  await ensureLocalPlansTable(db);
  const rows = await db.getAllAsync<{
    id: number;
    plan_name: string;
    plan_description: string;
    start_date: string;
    end_date: string;
    total_read_count: number;
    current_read_count: number;
    goal_percent: number;
    rest_day: number;
    selected_book_codes: string;
  }>(
    `SELECT id, plan_name, plan_description, start_date, end_date, total_read_count, current_read_count, goal_percent, rest_day, selected_book_codes
     FROM ${PLANS_TABLE} ORDER BY id DESC`,
  );

  return rows.map((r) => ({
    id: r.id,
    planName: r.plan_name ?? '',
    planDescription: r.plan_description ?? '',
    startDate: r.start_date ?? '',
    endDate: r.end_date ?? '',
    totalReadCount: r.total_read_count ?? 0,
    currentReadCount: r.current_read_count ?? 0,
    goalPercent: r.goal_percent ?? 0,
    restDay: calcRestDay(r.end_date ?? ''),
    selectedBookCodes: parseJson<string[]>(r.selected_book_codes ?? '[]'),
  }));
}

export async function getActivePlansForBookChapter(
  db: SQLiteDatabase,
  bookCode: string,
  chapter: number,
  date = todayString(),
): Promise<PlanChapterSelectionItem[]> {
  const bookIndex = BIBLE_BOOKS.findIndex((book) => book.bookCode === bookCode);
  if (bookIndex < 0 || chapter <= 0) return [];

  const userId = getActiveUserId();
  if (userId) {
    const rows = await getRemotePlanRows(userId);
    return rows
      .map((row) => {
        const selectedBookCodes = parseJson<string[]>(row.selected_book_codes).filter(
          (value): value is string => typeof value === 'string',
        );
        if (!selectedBookCodes.includes(bookCode)) return null;

        const startDate = String(row.start_date ?? '');
        const endDate = String(row.end_date ?? '');
        if (!isDateWithinRange(date, startDate, endDate)) return null;

        const goalStatus = normalizeGoalStatus(row.goal_status);
        const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);

        return {
          id: Number(row.id ?? 0),
          planName: String(row.plan_name ?? ''),
          planDescription: String(row.plan_description ?? ''),
          startDate,
          endDate,
          totalReadCount: computed.totalReadCount,
          currentReadCount: computed.currentReadCount,
          goalPercent: computed.goalPercent,
          currentChapterReadCount: normalizeChapterReadCount(goalStatus[bookIndex]?.[chapter - 1]),
        } satisfies PlanChapterSelectionItem;
      })
      .filter((item): item is PlanChapterSelectionItem => item !== null);
  }

  await ensureLocalPlansTable(db);
  const rows = await db.getAllAsync<{
    id: number;
    plan_name: string;
    plan_description: string;
    start_date: string;
    end_date: string;
    goal_status: string;
    selected_book_codes: string;
  }>(
    `SELECT id, plan_name, plan_description, start_date, end_date, goal_status, selected_book_codes FROM ${PLANS_TABLE} ORDER BY id DESC`,
  );

  return rows
    .map((row) => {
      const selectedBookCodes = parseJson<string[]>(row.selected_book_codes ?? '[]');
      if (!selectedBookCodes.includes(bookCode)) return null;

      const startDate = row.start_date ?? '';
      const endDate = row.end_date ?? '';
      if (!isDateWithinRange(date, startDate, endDate)) return null;

      const goalStatus = normalizeGoalStatus(parseJson<GoalStatus>(row.goal_status ?? '[]'));
      const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);

      return {
        id: row.id,
        planName: row.plan_name ?? '',
        planDescription: row.plan_description ?? '',
        startDate,
        endDate,
        totalReadCount: computed.totalReadCount,
        currentReadCount: computed.currentReadCount,
        goalPercent: computed.goalPercent,
        currentChapterReadCount: normalizeChapterReadCount(goalStatus[bookIndex]?.[chapter - 1]),
      } satisfies PlanChapterSelectionItem;
    })
    .filter((item): item is PlanChapterSelectionItem => item !== null);
}

export async function getPlanById(db: SQLiteDatabase, id: number): Promise<PlanRecord | null> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(PLANS_TABLE)
      .select(
        'id, plan_name, plan_description, start_date, end_date, total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day, goal_status, selected_book_codes, created_at, updated_at',
      )
      .eq('user_id', userId)
      .is('church_id', null)
      .eq('id', id)
      .maybeSingle();

    if (error) throw toSupabaseError(error);
    return data ? normalizeRemotePlanToRecord(data as RemotePlanRow) : null;
  }

  await ensureLocalPlansTable(db);
  const row = await db.getFirstAsync<{
    id: number;
    plan_name: string;
    plan_description: string;
    start_date: string;
    end_date: string;
    total_read_count: number;
    current_read_count: number;
    goal_percent: number;
    read_count_per_day: number;
    rest_day: number;
    goal_status: string;
    selected_book_codes: string;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM ${PLANS_TABLE} WHERE id = ?`, id);

  if (!row) return null;

  const endDate = row.end_date ?? '';
  const goalStatus = normalizeGoalStatus(parseJson<GoalStatus>(row.goal_status ?? '[]'));
  const selectedBookCodes = parseJson<string[]>(row.selected_book_codes ?? '[]');
  const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);

  return {
    id: row.id,
    planName: row.plan_name ?? '',
    planDescription: row.plan_description ?? '',
    startDate: row.start_date ?? '',
    endDate,
    totalReadCount: computed.totalReadCount,
    currentReadCount: computed.currentReadCount,
    goalPercent: computed.goalPercent,
    readCountPerDay: computed.readCountPerDay,
    restDay: computed.restDay,
    goalStatus,
    selectedBookCodes,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

export async function updatePlanInfo(
  db: SQLiteDatabase,
  id: number,
  planName: string,
  planDescription: string,
  startDate: string,
  endDate: string,
  selectedBookCodes: string[],
): Promise<void> {
  const plan = await getPlanById(db, id);
  if (!plan) return;

  const goalStatus = plan.goalStatus;
  const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);
  const now = nowString();
  const userId = getActiveUserId();

  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from(PLANS_TABLE)
      .update({
        plan_name: planName.trim(),
        plan_description: planDescription.trim(),
        start_date: startDate,
        end_date: endDate,
        selected_book_codes: selectedBookCodes,
        total_read_count: computed.totalReadCount,
        current_read_count: computed.currentReadCount,
        goal_percent: computed.goalPercent,
        read_count_per_day: computed.readCountPerDay,
        rest_day: computed.restDay,
        updated_at: now,
      })
      .eq('user_id', userId)
      .is('church_id', null)
      .eq('id', id);

    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPlansTable(db);
  await db.runAsync(
    `UPDATE ${PLANS_TABLE} SET
      plan_name = ?, plan_description = ?, start_date = ?, end_date = ?,
      selected_book_codes = ?,
      total_read_count = ?, current_read_count = ?,
      goal_percent = ?, read_count_per_day = ?, rest_day = ?,
      updated_at = ?
    WHERE id = ?`,
    planName.trim(),
    planDescription.trim(),
    startDate,
    endDate,
    JSON.stringify(selectedBookCodes),
    computed.totalReadCount,
    computed.currentReadCount,
    computed.goalPercent,
    computed.readCountPerDay,
    computed.restDay,
    now,
    id,
  );
  await queuePersistedSlicesSave(db, ['plans']);
}

export async function updateGoalStatus(
  db: SQLiteDatabase,
  id: number,
  goalStatus: GoalStatus,
): Promise<void> {
  const plan = await getPlanById(db, id);
  if (!plan) return;

  const normalizedGoalStatus = normalizeGoalStatus(goalStatus);
  const computed = recalcAndUpdate(normalizedGoalStatus, plan.selectedBookCodes, plan.endDate);
  const now = nowString();
  const userId = getActiveUserId();

  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from(PLANS_TABLE)
      .update({
        goal_status: normalizedGoalStatus,
        current_read_count: computed.currentReadCount,
        goal_percent: computed.goalPercent,
        read_count_per_day: computed.readCountPerDay,
        rest_day: computed.restDay,
        updated_at: now,
      })
      .eq('user_id', userId)
      .is('church_id', null)
      .eq('id', id);

    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPlansTable(db);
  await db.runAsync(
    `UPDATE ${PLANS_TABLE} SET
      goal_status = ?,
      current_read_count = ?, goal_percent = ?,
      read_count_per_day = ?, rest_day = ?,
      updated_at = ?
    WHERE id = ?`,
    JSON.stringify(normalizedGoalStatus),
    computed.currentReadCount,
    computed.goalPercent,
    computed.readCountPerDay,
    computed.restDay,
    now,
    id,
  );
  await queuePersistedSlicesSave(db, ['plans']);
}

export async function incrementPlanBookChapterReadCount(
  db: SQLiteDatabase,
  id: number,
  bookCode: string,
  chapter: number,
): Promise<{ previousBookStatus: number[]; nextBookStatus: number[] } | null> {
  const plan = await getPlanById(db, id);
  if (!plan || chapter <= 0 || !plan.selectedBookCodes.includes(bookCode)) return null;

  const bookIndex = BIBLE_BOOKS.findIndex((book) => book.bookCode === bookCode);
  const book = BIBLE_BOOKS[bookIndex];
  if (bookIndex < 0 || !book || chapter > book.maxChapter) return null;

  const nextGoalStatus = plan.goalStatus.map((row) => [...row]);
  const previousBookStatus = Array.from(
    { length: book.maxChapter },
    (_entry, chapterIndex) =>
      normalizeChapterReadCount(plan.goalStatus[bookIndex]?.[chapterIndex]),
  );
  const nextBookStatus = [...previousBookStatus];
  nextBookStatus[chapter - 1] = normalizeChapterReadCount(nextBookStatus[chapter - 1]) + 1;
  nextGoalStatus[bookIndex] = nextBookStatus;

  await updateGoalStatus(db, id, nextGoalStatus);

  return {
    previousBookStatus,
    nextBookStatus,
  };
}

export async function deletePlan(db: SQLiteDatabase, id: number): Promise<void> {
  const userId = getActiveUserId();
  if (userId) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from(PLANS_TABLE).delete().eq('user_id', userId).eq('id', id);
    if (error) throw toSupabaseError(error);
    return;
  }

  await ensureLocalPlansTable(db);
  await db.runAsync(`DELETE FROM ${PLANS_TABLE} WHERE id = ?`, id);
  await queuePersistedSlicesSave(db, ['plans']);
}
