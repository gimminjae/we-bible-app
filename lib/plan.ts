import { bibleInfos } from '@/services/bible';
import { formatDate, todayString } from '@/lib/date';

export const BIBLE_BOOKS = bibleInfos.filter((book) => book.bookSeq >= 1 && book.bookSeq <= 66);

export type GoalStatus = number[][];
export type PlanScope = 'personal' | 'church' | 'team';

export type PlanRecord = {
  id: string;
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
  churchId: string | null;
  teamId: string | null;
  createdByUserId: string | null;
  scope: PlanScope;
};

export function createEmptyGoalStatus(): GoalStatus {
  return BIBLE_BOOKS.map((book) => Array(book.maxChapter).fill(0));
}

export function getPlanScope(churchId?: string | null, teamId?: string | null): PlanScope {
  if (teamId) return 'team';
  if (churchId) return 'church';
  return 'personal';
}

export function calcTotalReadCount(selectedBookCodes: string[]): number {
  return selectedBookCodes.reduce((sum, code) => {
    const book = BIBLE_BOOKS.find((entry) => entry.bookCode === code);
    return sum + (book?.maxChapter ?? 0);
  }, 0);
}

export function calcCurrentReadCount(goalStatus: GoalStatus, selectedBookCodes: string[]): number {
  return BIBLE_BOOKS.reduce((sum, book, bookIndex) => {
    if (!selectedBookCodes.includes(book.bookCode)) return sum;
    const chapters = goalStatus[bookIndex] ?? [];
    return sum + chapters.filter((chapter) => chapter === 1).length;
  }, 0);
}

export function calcRestDay(endDate: string): number {
  const today = new Date(todayString());
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return 0;
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
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

export function recalcPlanFields(goalStatus: GoalStatus, selectedBookCodes: string[], endDate: string) {
  const totalReadCount = calcTotalReadCount(selectedBookCodes);
  const currentReadCount = calcCurrentReadCount(goalStatus, selectedBookCodes);
  const restDay = calcRestDay(endDate);
  const readCountPerDay = calcReadCountPerDay(totalReadCount, currentReadCount, restDay);
  const goalPercent = calcGoalPercent(totalReadCount, currentReadCount);
  return {
    totalReadCount,
    currentReadCount,
    restDay,
    readCountPerDay,
    goalPercent,
  };
}

export function createInitialPlan(
  id: string,
  planName: string,
  startDate: string,
  endDate: string,
  selectedBookCodes: string[],
  createdAt: string,
  metadata?: {
    churchId?: string | null;
    teamId?: string | null;
    createdByUserId?: string | null;
  },
): PlanRecord {
  const goalStatus = createEmptyGoalStatus();
  return {
    id,
    planName,
    startDate,
    endDate,
    goalStatus,
    selectedBookCodes,
    createdAt,
    updatedAt: createdAt,
    churchId: metadata?.churchId ?? null,
    teamId: metadata?.teamId ?? null,
    createdByUserId: metadata?.createdByUserId ?? null,
    scope: getPlanScope(metadata?.churchId ?? null, metadata?.teamId ?? null),
    ...recalcPlanFields(goalStatus, selectedBookCodes, endDate),
  };
}

export function updatePlanComputedFields(plan: PlanRecord): PlanRecord {
  return {
    ...plan,
    ...recalcPlanFields(plan.goalStatus, plan.selectedBookCodes, plan.endDate),
  };
}

export function getPlanGoalSummary(selectedBookCodes: string[]): { oldTestament: number; newTestament: number } {
  const oldCount = selectedBookCodes.filter((code) => {
    const book = BIBLE_BOOKS.find((entry) => entry.bookCode === code);
    return (book?.bookSeq ?? 999) <= 39;
  }).length;
  return {
    oldTestament: oldCount,
    newTestament: selectedBookCodes.length - oldCount,
  };
}

export function createDefaultPlanDates(): { startDate: string; endDate: string } {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 30);
  return {
    startDate: formatDate(today),
    endDate: formatDate(end),
  };
}
