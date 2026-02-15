import { bibleInfos } from '@/services/bible';
import type { SQLiteDatabase } from 'expo-sqlite';

const PLANS_TABLE = 'plans';

/** 66개 성경 (bookSeq 1~66) */
export const BIBLE_BOOKS = bibleInfos.filter((b) => b.bookSeq >= 1 && b.bookSeq <= 66);

/** goalStatus: 2차원 배열. 1차원=66성경, 2차원=각 성경의 장별 상태 (0=미읽음, 1=읽음) */
export type GoalStatus = number[][];

export type PlanRecord = {
  id: number;
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

export type PlanListItem = {
  id: number;
  planName: string;
  startDate: string;
  endDate: string;
  totalReadCount: number;
  currentReadCount: number;
  goalPercent: number;
  restDay: number;
  selectedBookCodes: string[];
};

function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 선택된 책들의 총 장 수 */
export function calcTotalReadCount(selectedBookCodes: string[]): number {
  return selectedBookCodes.reduce((sum, code) => {
    const book = BIBLE_BOOKS.find((b) => b.bookCode === code);
    return sum + (book?.maxChapter ?? 0);
  }, 0);
}

/** goalStatus에서 선택된 책들의 읽은 장 수 합계 */
export function calcCurrentReadCount(
  goalStatus: GoalStatus,
  selectedBookCodes: string[]
): number {
  let count = 0;
  for (let i = 0; i < BIBLE_BOOKS.length; i++) {
    const book = BIBLE_BOOKS[i];
    if (!selectedBookCodes.includes(book.bookCode)) continue;
    const chapters = goalStatus[i] ?? [];
    count += chapters.filter((v) => v === 1).length;
  }
  return count;
}

/** 오늘부터 endDate까지 잔여 일수 */
export function calcRestDay(endDate: string): number {
  const today = new Date(todayString());
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/** 하루당 읽어야 할 장 수 */
export function calcReadCountPerDay(
  totalReadCount: number,
  currentReadCount: number,
  restDay: number
): number {
  const remaining = totalReadCount - currentReadCount;
  if (restDay <= 0 || remaining <= 0) return 0;
  return Math.round((remaining / restDay) * 100) / 100;
}

/** 목표 달성 퍼센트 */
export function calcGoalPercent(totalReadCount: number, currentReadCount: number): number {
  if (totalReadCount <= 0) return 0;
  return Math.round((currentReadCount / totalReadCount) * 10000) / 100;
}

/** 빈 goalStatus 초기화 (66개 성경, 각각 maxChapter 길이의 0 배열) */
export function createEmptyGoalStatus(): GoalStatus {
  return BIBLE_BOOKS.map((b) => Array(b.maxChapter).fill(0));
}

/** goalStatus를 goalStatus와 selectedBookCodes에 맞게 재계산하여 업데이트 */
function recalcAndUpdate(
  goalStatus: GoalStatus,
  selectedBookCodes: string[],
  endDate: string
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

export async function initPlansTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${PLANS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_name TEXT NOT NULL DEFAULT '',
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
}

export async function addPlan(
  db: SQLiteDatabase,
  planName: string,
  startDate: string,
  endDate: string,
  selectedBookCodes: string[]
): Promise<number> {
  const now = nowString();
  const goalStatus = createEmptyGoalStatus();
  const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);

  const result = await db.runAsync(
    `INSERT INTO ${PLANS_TABLE} (
      plan_name, start_date, end_date,
      total_read_count, current_read_count, goal_percent, read_count_per_day, rest_day,
      goal_status, selected_book_codes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    planName.trim(),
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
    now
  );
  return Number(result.lastInsertRowId);
}

export async function getAllPlans(db: SQLiteDatabase): Promise<PlanListItem[]> {
  const rows = await db.getAllAsync<{
    id: number;
    plan_name: string;
    start_date: string;
    end_date: string;
    total_read_count: number;
    current_read_count: number;
    goal_percent: number;
    rest_day: number;
    selected_book_codes: string;
  }>(
    `SELECT id, plan_name, start_date, end_date, total_read_count, current_read_count, goal_percent, rest_day, selected_book_codes
     FROM ${PLANS_TABLE} ORDER BY id DESC`
  );

  return rows.map((r) => ({
    id: r.id,
    planName: r.plan_name ?? '',
    startDate: r.start_date ?? '',
    endDate: r.end_date ?? '',
    totalReadCount: r.total_read_count ?? 0,
    currentReadCount: r.current_read_count ?? 0,
    goalPercent: r.goal_percent ?? 0,
    restDay: calcRestDay(r.end_date ?? ''),
    selectedBookCodes: parseJson<string[]>(r.selected_book_codes ?? '[]'),
  }));
}

export async function getPlanById(db: SQLiteDatabase, id: number): Promise<PlanRecord | null> {
  const row = await db.getFirstAsync<{
    id: number;
    plan_name: string;
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
  const restDay = calcRestDay(endDate);
  const readCountPerDay = calcReadCountPerDay(
    row.total_read_count ?? 0,
    row.current_read_count ?? 0,
    restDay
  );

  return {
    id: row.id,
    planName: row.plan_name ?? '',
    startDate: row.start_date ?? '',
    endDate,
    totalReadCount: row.total_read_count ?? 0,
    currentReadCount: row.current_read_count ?? 0,
    goalPercent: row.goal_percent ?? 0,
    readCountPerDay,
    restDay,
    goalStatus: parseJson<GoalStatus>(row.goal_status ?? '[]'),
    selectedBookCodes: parseJson<string[]>(row.selected_book_codes ?? '[]'),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function parseJson<T>(s: string): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return [] as unknown as T;
  }
}

export async function updatePlanInfo(
  db: SQLiteDatabase,
  id: number,
  planName: string,
  startDate: string,
  endDate: string,
  selectedBookCodes: string[]
): Promise<void> {
  const plan = await getPlanById(db, id);
  if (!plan) return;

  const goalStatus = plan.goalStatus;
  const computed = recalcAndUpdate(goalStatus, selectedBookCodes, endDate);
  const now = nowString();

  await db.runAsync(
    `UPDATE ${PLANS_TABLE} SET
      plan_name = ?, start_date = ?, end_date = ?,
      selected_book_codes = ?,
      total_read_count = ?, current_read_count = ?,
      goal_percent = ?, read_count_per_day = ?, rest_day = ?,
      updated_at = ?
    WHERE id = ?`,
    planName.trim(),
    startDate,
    endDate,
    JSON.stringify(selectedBookCodes),
    computed.totalReadCount,
    computed.currentReadCount,
    computed.goalPercent,
    computed.readCountPerDay,
    computed.restDay,
    now,
    id
  );
}

export async function updateGoalStatus(
  db: SQLiteDatabase,
  id: number,
  goalStatus: GoalStatus
): Promise<void> {
  const plan = await getPlanById(db, id);
  if (!plan) return;

  const computed = recalcAndUpdate(goalStatus, plan.selectedBookCodes, plan.endDate);
  const now = nowString();

  await db.runAsync(
    `UPDATE ${PLANS_TABLE} SET
      goal_status = ?,
      current_read_count = ?, goal_percent = ?,
      read_count_per_day = ?, rest_day = ?,
      updated_at = ?
    WHERE id = ?`,
    JSON.stringify(goalStatus),
    computed.currentReadCount,
    computed.goalPercent,
    computed.readCountPerDay,
    computed.restDay,
    now,
    id
  );
}

export async function deletePlan(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM ${PLANS_TABLE} WHERE id = ?`, id);
}
