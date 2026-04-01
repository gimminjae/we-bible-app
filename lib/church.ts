import type { User } from "@supabase/supabase-js";

import {
  BIBLE_BOOKS,
  calcCurrentReadCount,
  calcGoalPercent,
  calcReadCountPerDay,
  calcRestDay,
  calcTotalReadCount,
  createEmptyGoalStatus,
  getPlanScope,
  updatePlanComputedFields,
  type GoalStatus,
  type PlanRecord,
  type PlanScope,
} from "@/lib/plan";
import { formatDateTime } from "@/lib/date";
import { createSupabaseClient } from "@/lib/supabase-client";
import { getUserDisplayName } from "@/lib/supabase";

export type ChurchRole = "super_admin" | "deputy_admin" | "member";
export type ChurchJoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type ChurchUserProfile = {
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

export type ChurchMembership = {
  churchId: string;
  userId: string;
  role: ChurchRole;
  teamId: string | null;
  joinedAt: string;
  updatedAt: string;
  profile: ChurchUserProfile;
  teamName: string | null;
};

export type ChurchJoinRequest = {
  id: string;
  churchId: string;
  requesterUserId: string;
  status: ChurchJoinRequestStatus;
  requestedAt: string;
  processedAt: string | null;
  processedByUserId: string | null;
  requester: ChurchUserProfile;
  processedBy: ChurchUserProfile | null;
};

export type ChurchPrayerScope = "church" | "team";

export type ChurchPrayerContent = {
  id: string;
  prayerId: string;
  content: string;
  registeredAt: string;
  createdByUserId: string;
  createdByName: string;
  canManage: boolean;
};

export type ChurchPrayer = {
  id: string;
  churchId: string;
  teamId: string | null;
  teamName: string | null;
  scope: ChurchPrayerScope;
  requester: string;
  target: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  latestContent: string;
  contentCount: number;
  contents: ChurchPrayerContent[];
  canManagePrayer: boolean;
  canAddContent: boolean;
};

export type SharedPlanSummary = {
  id: string;
  planName: string;
  startDate: string;
  endDate: string;
  churchId: string;
  teamId: string | null;
  scope: PlanScope;
  createdByUserId: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  selectedBookCodes: string[];
  totalReadCount: number;
  memberCount: number;
  averageGoalPercent: number;
  myGoalPercent: number | null;
};

export type ChurchTeam = {
  id: string;
  churchId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  leaderUserId: string | null;
  leaderName: string | null;
  memberCount: number;
  plans: SharedPlanSummary[];
};

export type ChurchSummary = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  myRole: ChurchRole | null;
  myTeamId: string | null;
  myTeamName: string | null;
  pendingRequestStatus: ChurchJoinRequestStatus | null;
};

export type ChurchSearchResult = ChurchSummary & {
  isMember: boolean;
};

export type ChurchDetail = {
  church: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    createdByUserId: string;
    superAdminUserId: string;
    memberCount: number;
    deputyAdminUserIds: string[];
    myRole: ChurchRole | null;
    myTeamId: string | null;
    myTeamName: string | null;
    isSuperAdmin: boolean;
    isDeputyAdmin: boolean;
    canManageMembers: boolean;
    canManagePlans: boolean;
    canManageTeams: boolean;
  };
  members: ChurchMembership[];
  pendingJoinRequests: ChurchJoinRequest[];
  prayers: ChurchPrayer[];
  teams: ChurchTeam[];
  plans: SharedPlanSummary[];
};

export type SharedPlanMemberProgress = {
  userId: string;
  role: ChurchRole;
  teamId: string | null;
  teamName: string | null;
  profile: ChurchUserProfile;
  plan: PlanRecord;
};

export type SharedPlanDetail = {
  church: ChurchDetail["church"];
  team: ChurchTeam | null;
  summary: SharedPlanSummary;
  memberProgressList: SharedPlanMemberProgress[];
  averageGoalPercent: number;
  myProgress: SharedPlanMemberProgress | null;
  canEditPlan: boolean;
  canUpdateMyProgress: boolean;
};

export type MySharedPlanSummary = SharedPlanSummary & {
  churchName: string;
  teamName: string | null;
};

type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type ChurchRow = {
  id: number;
  name: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_user_id: string | null;
  super_admin_user_id: string | null;
  member_count: number | null;
  deputy_admin_user_ids: string | null;
};

type MembershipRow = {
  church_id: number;
  user_id: string;
  role: ChurchRole | null;
  team_id: number | null;
  joined_at: string | null;
  updated_at: string | null;
};

type TeamRow = {
  id: number;
  church_id: number;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_user_id: string | null;
  leader_user_id: string | null;
};

type JoinRequestRow = {
  id: number;
  church_id: number;
  requester_user_id: string;
  status: ChurchJoinRequestStatus | null;
  requested_at: string | null;
  processed_at: string | null;
  processed_by_user_id: string | null;
};

type SharedPlanRow = {
  id: number;
  user_id: string | null;
  plan_name: string | null;
  start_date: string | null;
  end_date: string | null;
  goal_status?: unknown;
  selected_book_codes: unknown;
  created_at: string | null;
  updated_at: string | null;
  church_id: number | null;
  team_id: number | null;
};

type PlanProgressRow = {
  plan_id: number;
  user_id: string;
  goal_status: unknown;
  current_read_count: number | null;
  goal_percent: number | null;
  read_count_per_day: number | null;
  rest_day: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type ChurchPrayerRow = {
  id: number;
  church_id: number;
  team_id: number | null;
  requester: string | null;
  target: string | null;
  created_by_user_id: string;
  created_at: string | null;
  updated_at: string | null;
};

type ChurchPrayerContentRow = {
  id: number;
  prayer_id: number;
  created_by_user_id: string;
  content: string | null;
  registered_at: string | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonText<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return (JSON.parse(value) as T) ?? fallback;
    } catch {
      return fallback;
    }
  }

  if (value == null) return fallback;
  return value as T;
}

function normalizeSelectedBookCodes(raw: unknown) {
  return parseJsonText<string[]>(raw, []).filter((value): value is string => typeof value === "string");
}

function normalizeGoalStatus(raw: unknown): GoalStatus {
  const parsedGoalStatus = parseJsonText<GoalStatus>(raw, createEmptyGoalStatus());
  return BIBLE_BOOKS.map((book, bookIndex) => {
    const source = Array.isArray(parsedGoalStatus[bookIndex]) ? parsedGoalStatus[bookIndex] : [];
    return Array.from({ length: book.maxChapter }, (_entry, chapterIndex) => {
      const value = source[chapterIndex];
      return value === 1 ? 1 : 0;
    });
  });
}

function makeProfileMap(rows: UserProfileRow[]) {
  return new Map(
    rows.map((row) => [
      row.user_id,
      {
        userId: row.user_id,
        displayName: row.display_name?.trim() || row.email?.trim() || `${row.user_id.slice(0, 8)}...`,
        email: row.email ?? null,
        avatarUrl: row.avatar_url ?? null,
      } satisfies ChurchUserProfile,
    ]),
  );
}

function parseDeputyAdminUserIds(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function roleOrder(role: ChurchRole) {
  if (role === "super_admin") return 0;
  if (role === "deputy_admin") return 1;
  return 2;
}

function isChurchAdminRole(role: ChurchRole | null | undefined) {
  return role === "super_admin" || role === "deputy_admin";
}

function createProgressPlanRecord(
  planRow: SharedPlanRow,
  progressRow: PlanProgressRow | null,
): PlanRecord {
  const selectedBookCodes = normalizeSelectedBookCodes(planRow.selected_book_codes);
  const goalStatus = normalizeGoalStatus(progressRow?.goal_status ?? createEmptyGoalStatus());
  const totalReadCount = calcTotalReadCount(selectedBookCodes);
  const currentReadCount = Math.max(0, Math.floor(toNumber(progressRow?.current_read_count, calcCurrentReadCount(goalStatus, selectedBookCodes))));
  const restDay = Math.max(0, Math.floor(toNumber(progressRow?.rest_day, calcRestDay(planRow.end_date ?? ""))));
  const readCountPerDay = toNumber(
    progressRow?.read_count_per_day,
    calcReadCountPerDay(totalReadCount, currentReadCount, restDay),
  );
  const goalPercent = toNumber(progressRow?.goal_percent, calcGoalPercent(totalReadCount, currentReadCount));

  return updatePlanComputedFields({
    id: String(planRow.id),
    planName: planRow.plan_name ?? "",
    startDate: planRow.start_date ?? "",
    endDate: planRow.end_date ?? "",
    totalReadCount,
    currentReadCount,
    goalPercent,
    readCountPerDay,
    restDay,
    goalStatus,
    selectedBookCodes,
    createdAt: progressRow?.created_at ?? planRow.created_at ?? "",
    updatedAt: progressRow?.updated_at ?? planRow.updated_at ?? planRow.created_at ?? "",
    churchId: planRow.church_id == null ? null : String(planRow.church_id),
    teamId: planRow.team_id == null ? null : String(planRow.team_id),
    createdByUserId: planRow.user_id ?? null,
    scope: getPlanScope(planRow.church_id == null ? null : String(planRow.church_id), planRow.team_id == null ? null : String(planRow.team_id)),
  });
}

function summarizeSharedPlan(args: {
  planRow: SharedPlanRow;
  progressRows: PlanProgressRow[];
  currentUserId: string;
  profileMap: Map<string, ChurchUserProfile>;
}): SharedPlanSummary {
  const { planRow, progressRows, currentUserId, profileMap } = args;
  const selectedBookCodes = normalizeSelectedBookCodes(planRow.selected_book_codes);
  const planRecords = progressRows.map((row) => createProgressPlanRecord(planRow, row));
  const averageGoalPercent =
    planRecords.length > 0
      ? Math.round((planRecords.reduce((sum, plan) => sum + plan.goalPercent, 0) / planRecords.length) * 100) / 100
      : 0;
  const myPlan = progressRows.find((row) => row.user_id === currentUserId);

  return {
    id: String(planRow.id),
    planName: planRow.plan_name ?? "",
    startDate: planRow.start_date ?? "",
    endDate: planRow.end_date ?? "",
    churchId: String(planRow.church_id),
    teamId: planRow.team_id == null ? null : String(planRow.team_id),
    scope: getPlanScope(planRow.church_id == null ? null : String(planRow.church_id), planRow.team_id == null ? null : String(planRow.team_id)),
    createdByUserId: planRow.user_id ?? null,
    createdByName: planRow.user_id ? (profileMap.get(planRow.user_id)?.displayName ?? `${planRow.user_id.slice(0, 8)}...`) : "-",
    createdAt: planRow.created_at ?? "",
    updatedAt: planRow.updated_at ?? "",
    selectedBookCodes,
    totalReadCount: calcTotalReadCount(selectedBookCodes),
    memberCount: progressRows.length,
    averageGoalPercent,
    myGoalPercent: myPlan ? createProgressPlanRecord(planRow, myPlan).goalPercent : null,
  };
}

function summarizeChurchPrayer(args: {
  prayerRow: ChurchPrayerRow;
  contentRows: ChurchPrayerContentRow[];
  currentUserId: string;
  currentUserRole: ChurchRole | null;
  profileMap: Map<string, ChurchUserProfile>;
  teamMap: Map<number, TeamRow>;
}): ChurchPrayer {
  const { prayerRow, contentRows, currentUserId, currentUserRole, profileMap, teamMap } = args;
  const canManagePrayer =
    prayerRow.created_by_user_id === currentUserId ||
    isChurchAdminRole(currentUserRole);

  const contents = contentRows.map((row) => ({
    id: String(row.id),
    prayerId: String(row.prayer_id),
    content: row.content ?? "",
    registeredAt: row.registered_at ?? "",
    createdByUserId: row.created_by_user_id,
    createdByName:
      profileMap.get(row.created_by_user_id)?.displayName ??
      `${row.created_by_user_id.slice(0, 8)}...`,
    canManage: canManagePrayer || row.created_by_user_id === currentUserId,
  }));

  return {
    id: String(prayerRow.id),
    churchId: String(prayerRow.church_id),
    teamId: prayerRow.team_id == null ? null : String(prayerRow.team_id),
    teamName: prayerRow.team_id == null ? null : teamMap.get(prayerRow.team_id)?.name ?? null,
    scope: prayerRow.team_id == null ? "church" : "team",
    requester: prayerRow.requester?.trim() ?? "",
    target: prayerRow.target?.trim() ?? "",
    createdByUserId: prayerRow.created_by_user_id,
    createdByName:
      profileMap.get(prayerRow.created_by_user_id)?.displayName ??
      `${prayerRow.created_by_user_id.slice(0, 8)}...`,
    createdAt: prayerRow.created_at ?? "",
    updatedAt: prayerRow.updated_at ?? prayerRow.created_at ?? "",
    latestContent: contents[0]?.content ?? "",
    contentCount: contents.length,
    contents,
    canManagePrayer,
    canAddContent: true,
  };
}

async function fetchProfilesForUserIds(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) return new Map<string, ChurchUserProfile>();

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, email, avatar_url")
    .in("user_id", uniqueUserIds);

  if (error) throw error;
  return makeProfileMap((data ?? []) as UserProfileRow[]);
}

export async function fetchUserProfile(userId: string): Promise<ChurchUserProfile | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, email, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const row = data as UserProfileRow | null;
  if (!row) return null;

  return {
    userId: row.user_id,
    displayName: row.display_name?.trim() || row.email?.trim() || `${row.user_id.slice(0, 8)}...`,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}

export async function updateMyDisplayName(userId: string, displayName: string) {
  const trimmedDisplayName = displayName.trim();
  const supabase = createSupabaseClient();

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      display_name: trimmedDisplayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (profileError) throw profileError;

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: trimmedDisplayName,
      name: trimmedDisplayName,
      nickname: trimmedDisplayName,
      preferred_username: trimmedDisplayName,
    },
  });

  if (authError) throw authError;

  return trimmedDisplayName;
}

export async function syncUserProfileFromAuthUser(user: User) {
  const supabase = createSupabaseClient();
  const displayName = getUserDisplayName(user) ?? user.email ?? user.id.slice(0, 8);

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      display_name: displayName,
      email: user.email ?? null,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function createChurch(args: { name: string; description: string }) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("create_church", {
    p_name: args.name.trim(),
    p_description: args.description.trim(),
  });
  if (error) throw error;
  return String(data);
}

export async function updateChurchInfo(args: {
  churchId: string;
  name: string;
  description: string;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("update_church_info", {
    p_church_id: Number(args.churchId),
    p_name: args.name.trim(),
    p_description: args.description.trim(),
  });

  if (error) throw error;
}

export async function requestChurchJoin(churchId: string, userId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("church_join_requests").insert({
    church_id: Number(churchId),
    requester_user_id: userId,
    status: "pending",
  });
  if (error) throw error;
}

export async function fetchMyChurches(userId: string): Promise<ChurchSummary[]> {
  const supabase = createSupabaseClient();
  const { data: membershipData, error: membershipError } = await supabase
    .from("church_memberships")
    .select("church_id, user_id, role, team_id, joined_at, updated_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (membershipError) throw membershipError;

  const memberships = (membershipData ?? []) as MembershipRow[];
  if (!memberships.length) return [];

  const churchIds = memberships.map((item) => item.church_id);
  const teamIds = memberships.map((item) => item.team_id).filter((value): value is number => value != null);

  const [{ data: churchData, error: churchError }, { data: teamData, error: teamError }] = await Promise.all([
    supabase
      .from("churches")
      .select("id, name, description, created_at, updated_at, created_by_user_id, super_admin_user_id, member_count, deputy_admin_user_ids")
      .in("id", churchIds),
    teamIds.length
      ? supabase.from("teams").select("id, church_id, name, created_at, updated_at, created_by_user_id, leader_user_id").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (churchError) throw churchError;
  if (teamError) throw teamError;

  const teamMap = new Map((teamData ?? []).map((row) => [row.id, row as TeamRow]));

  return ((churchData ?? []) as ChurchRow[])
    .map((church) => {
      const myMembership = memberships.find((membership) => membership.church_id === church.id) ?? null;
      const myTeam = myMembership?.team_id ? teamMap.get(myMembership.team_id) ?? null : null;
      return {
        id: String(church.id),
        name: church.name ?? "",
        description: church.description?.trim() ?? "",
        createdAt: church.created_at ?? "",
        updatedAt: church.updated_at ?? "",
        memberCount: Math.max(0, Math.floor(toNumber(church.member_count, 0))),
        myRole: myMembership?.role ?? null,
        myTeamId: myMembership?.team_id == null ? null : String(myMembership.team_id),
        myTeamName: myTeam?.name ?? null,
        pendingRequestStatus: null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

export async function fetchMySharedPlans(currentUserId: string): Promise<MySharedPlanSummary[]> {
  const supabase = createSupabaseClient();
  const { data: membershipData, error: membershipError } = await supabase
    .from("church_memberships")
    .select("church_id, user_id, role, team_id, joined_at, updated_at")
    .eq("user_id", currentUserId);

  if (membershipError) throw membershipError;

  const memberships = (membershipData ?? []) as MembershipRow[];
  if (!memberships.length) return [];

  const churchIds = [...new Set(memberships.map((membership) => membership.church_id))];
  const [{ data: churchData, error: churchError }, { data: planData, error: planError }] = await Promise.all([
    supabase
      .from("churches")
      .select("id, name, description, created_at, updated_at, created_by_user_id, super_admin_user_id, member_count, deputy_admin_user_ids")
      .in("id", churchIds),
    supabase
      .from("plans")
      .select("id, user_id, plan_name, start_date, end_date, selected_book_codes, created_at, updated_at, church_id, team_id")
      .in("church_id", churchIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (churchError) throw churchError;
  if (planError) throw planError;

  const candidatePlans = (planData ?? []) as SharedPlanRow[];
  if (!candidatePlans.length) return [];

  const candidatePlanIds = candidatePlans.map((plan) => plan.id);
  const { data: myProgressData, error: myProgressError } = await supabase
    .from("plan_progresses")
    .select("plan_id, user_id, goal_status, current_read_count, goal_percent, read_count_per_day, rest_day, created_at, updated_at")
    .eq("user_id", currentUserId)
    .in("plan_id", candidatePlanIds);

  if (myProgressError) throw myProgressError;

  const myProgressRows = (myProgressData ?? []) as PlanProgressRow[];
  const myAccessiblePlanIds = new Set(myProgressRows.map((row) => row.plan_id));
  const accessiblePlans = candidatePlans.filter((plan) => myAccessiblePlanIds.has(plan.id));

  if (!accessiblePlans.length) return [];

  const accessiblePlanIds = accessiblePlans.map((plan) => plan.id);
  const teamIds = [...new Set(accessiblePlans.map((plan) => plan.team_id).filter((value): value is number => value != null))];
  const createdByUserIds = [...new Set(accessiblePlans.map((plan) => plan.user_id).filter((value): value is string => Boolean(value)))];

  const [
    { data: progressData, error: progressError },
    teamResult,
    profileMap,
  ] = await Promise.all([
    supabase
      .from("plan_progresses")
      .select("plan_id, user_id, goal_status, current_read_count, goal_percent, read_count_per_day, rest_day, created_at, updated_at")
      .in("plan_id", accessiblePlanIds),
    teamIds.length
      ? supabase.from("teams").select("id, church_id, name, created_at, updated_at, created_by_user_id, leader_user_id").in("id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    fetchProfilesForUserIds(createdByUserIds),
  ]);

  if (progressError) throw progressError;
  if (teamResult.error) throw teamResult.error;

  const churchMap = new Map(((churchData ?? []) as ChurchRow[]).map((church) => [church.id, church]));
  const teamMap = new Map(((teamResult.data ?? []) as TeamRow[]).map((team) => [team.id, team]));
  const progressMap = new Map<number, PlanProgressRow[]>();

  for (const row of (progressData ?? []) as PlanProgressRow[]) {
    const existing = progressMap.get(row.plan_id);
    if (existing) existing.push(row);
    else progressMap.set(row.plan_id, [row]);
  }

  return accessiblePlans.map((plan) => {
    const summary = summarizeSharedPlan({
      planRow: plan,
      progressRows: progressMap.get(plan.id) ?? [],
      currentUserId,
      profileMap,
    });

    return {
      ...summary,
      churchName: churchMap.get(plan.church_id ?? -1)?.name ?? "",
      teamName: plan.team_id == null ? null : teamMap.get(plan.team_id)?.name ?? null,
    };
  });
}

export async function searchChurches(userId: string, searchTerm: string): Promise<ChurchSearchResult[]> {
  const keyword = searchTerm.trim();
  if (!keyword) return [];

  const supabase = createSupabaseClient();
  const { data: churchData, error: churchError } = await supabase
    .from("churches")
    .select("id, name, description, created_at, updated_at, created_by_user_id, super_admin_user_id, member_count, deputy_admin_user_ids")
    .ilike("name", `%${keyword}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (churchError) throw churchError;

  const churches = (churchData ?? []) as ChurchRow[];
  if (!churches.length) return [];

  const churchIds = churches.map((church) => church.id);
  const [{ data: membershipsData, error: membershipsError }, { data: requestsData, error: requestsError }] = await Promise.all([
    supabase
      .from("church_memberships")
      .select("church_id, user_id, role, team_id, joined_at, updated_at")
      .eq("user_id", userId)
      .in("church_id", churchIds),
    supabase
      .from("church_join_requests")
      .select("id, church_id, requester_user_id, status, requested_at, processed_at, processed_by_user_id")
      .eq("requester_user_id", userId)
      .in("church_id", churchIds),
  ]);

  if (membershipsError) throw membershipsError;
  if (requestsError) throw requestsError;

  const membershipMap = new Map((membershipsData ?? []).map((row) => [row.church_id, row as MembershipRow]));
  const requestMap = new Map((requestsData ?? []).map((row) => [row.church_id, row as JoinRequestRow]));

  return churches.map((church) => {
    const membership = membershipMap.get(church.id) ?? null;
    const request = requestMap.get(church.id) ?? null;

    return {
      id: String(church.id),
      name: church.name ?? "",
      description: church.description?.trim() ?? "",
      createdAt: church.created_at ?? "",
      updatedAt: church.updated_at ?? "",
      memberCount: Math.max(0, Math.floor(toNumber(church.member_count, 0))),
      myRole: membership?.role ?? null,
      myTeamId: membership?.team_id == null ? null : String(membership.team_id),
      myTeamName: null,
      pendingRequestStatus: request?.status ?? null,
      isMember: Boolean(membership),
    };
  });
}

export async function fetchChurchDetail(churchId: string, currentUserId: string): Promise<ChurchDetail> {
  const supabase = createSupabaseClient();
  const numericChurchId = Number(churchId);

  const [
    churchResult,
    membershipsResult,
    teamsResult,
    plansResult,
    requestsResult,
    prayersResult,
  ] = await Promise.all([
    supabase
      .from("churches")
      .select("id, name, description, created_at, updated_at, created_by_user_id, super_admin_user_id, member_count, deputy_admin_user_ids")
      .eq("id", numericChurchId)
      .maybeSingle(),
    supabase
      .from("church_memberships")
      .select("church_id, user_id, role, team_id, joined_at, updated_at")
      .eq("church_id", numericChurchId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("teams")
      .select("id, church_id, name, created_at, updated_at, created_by_user_id, leader_user_id")
      .eq("church_id", numericChurchId)
      .order("created_at", { ascending: true }),
    supabase
      .from("plans")
      .select("id, user_id, plan_name, start_date, end_date, selected_book_codes, created_at, updated_at, church_id, team_id")
      .eq("church_id", numericChurchId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("church_join_requests")
      .select("id, church_id, requester_user_id, status, requested_at, processed_at, processed_by_user_id")
      .eq("church_id", numericChurchId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
    supabase
      .from("church_prayers")
      .select("id, church_id, team_id, requester, target, created_by_user_id, created_at, updated_at")
      .eq("church_id", numericChurchId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  for (const result of [churchResult, membershipsResult, teamsResult, plansResult, requestsResult, prayersResult]) {
    if (result.error) throw result.error;
  }

  const church = churchResult.data as ChurchRow | null;
  if (!church) {
    throw new Error("CHURCH_NOT_FOUND");
  }

  const memberships = (membershipsResult.data ?? []) as MembershipRow[];
  const teams = (teamsResult.data ?? []) as TeamRow[];
  const plans = (plansResult.data ?? []) as SharedPlanRow[];
  const joinRequests = (requestsResult.data ?? []) as JoinRequestRow[];
  const prayers = (prayersResult.data ?? []) as ChurchPrayerRow[];

  const planIds = plans.map((plan) => plan.id);
  const { data: progressData, error: progressError } = planIds.length
    ? await supabase
        .from("plan_progresses")
        .select("plan_id, user_id, goal_status, current_read_count, goal_percent, read_count_per_day, rest_day, created_at, updated_at")
        .in("plan_id", planIds)
    : { data: [], error: null };

  if (progressError) throw progressError;

  const prayerIds = prayers.map((prayer) => prayer.id);
  const { data: prayerContentsData, error: prayerContentsError } = prayerIds.length
    ? await supabase
        .from("church_prayer_contents")
        .select("id, prayer_id, created_by_user_id, content, registered_at")
        .in("prayer_id", prayerIds)
        .order("registered_at", { ascending: false })
        .order("id", { ascending: false })
    : { data: [], error: null };

  if (prayerContentsError) throw prayerContentsError;

  const progressRows = (progressData ?? []) as PlanProgressRow[];
  const progressMap = new Map<number, PlanProgressRow[]>();
  for (const row of progressRows) {
    const existing = progressMap.get(row.plan_id);
    if (existing) existing.push(row);
    else progressMap.set(row.plan_id, [row]);
  }

  const prayerContents = (prayerContentsData ?? []) as ChurchPrayerContentRow[];
  const prayerContentMap = new Map<number, ChurchPrayerContentRow[]>();
  for (const row of prayerContents) {
    const existing = prayerContentMap.get(row.prayer_id);
    if (existing) existing.push(row);
    else prayerContentMap.set(row.prayer_id, [row]);
  }

  const userIds = [
    church.created_by_user_id,
    church.super_admin_user_id,
    ...memberships.map((item) => item.user_id),
    ...teams.map((item) => item.created_by_user_id),
    ...teams.map((item) => item.leader_user_id),
    ...joinRequests.map((item) => item.requester_user_id),
    ...joinRequests.map((item) => item.processed_by_user_id),
    ...plans.map((item) => item.user_id),
    ...prayers.map((item) => item.created_by_user_id),
    ...prayerContents.map((item) => item.created_by_user_id),
  ].filter((value): value is string => Boolean(value));

  const profileMap = await fetchProfilesForUserIds(userIds);
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const myMembership = memberships.find((membership) => membership.user_id === currentUserId) ?? null;
  const myRole = myMembership?.role ?? null;

  const memberList = memberships
    .map((membership) => ({
      churchId: String(membership.church_id),
      userId: membership.user_id,
      role: membership.role ?? "member",
      teamId: membership.team_id == null ? null : String(membership.team_id),
      joinedAt: membership.joined_at ?? "",
      updatedAt: membership.updated_at ?? membership.joined_at ?? "",
      profile:
        profileMap.get(membership.user_id) ?? {
          userId: membership.user_id,
          displayName: `${membership.user_id.slice(0, 8)}...`,
          email: null,
          avatarUrl: null,
        },
      teamName: membership.team_id == null ? null : teamMap.get(membership.team_id)?.name ?? null,
    }))
    .sort((left, right) => {
      const roleDiff = roleOrder(left.role) - roleOrder(right.role);
      if (roleDiff !== 0) return roleDiff;
      return left.profile.displayName.localeCompare(right.profile.displayName, "ko");
    });

  const planSummaries = plans.map((plan) => {
    const audienceUserIds = new Set(
      memberships
        .filter((membership) => (plan.team_id == null ? true : membership.team_id === plan.team_id))
        .map((membership) => membership.user_id),
    );

    return summarizeSharedPlan({
      planRow: plan,
      progressRows: (progressMap.get(plan.id) ?? []).filter((row) => audienceUserIds.has(row.user_id)),
      currentUserId,
      profileMap,
    });
  });

  const teamSummaries = teams.map((team) => ({
    id: String(team.id),
    churchId: String(team.church_id),
    name: team.name ?? "",
    createdAt: team.created_at ?? "",
    updatedAt: team.updated_at ?? "",
    createdByUserId: team.created_by_user_id ?? "",
    leaderUserId: team.leader_user_id ?? null,
    leaderName: team.leader_user_id ? (profileMap.get(team.leader_user_id)?.displayName ?? null) : null,
    memberCount: memberList.filter((member) => member.teamId === String(team.id)).length,
    plans: planSummaries.filter((plan) => plan.teamId === String(team.id)),
  }));

  const pendingJoinRequests = joinRequests.map((request) => ({
    id: String(request.id),
    churchId: String(request.church_id),
    requesterUserId: request.requester_user_id,
    status: request.status ?? "pending",
    requestedAt: request.requested_at ?? "",
    processedAt: request.processed_at ?? null,
    processedByUserId: request.processed_by_user_id ?? null,
    requester:
      profileMap.get(request.requester_user_id) ?? {
        userId: request.requester_user_id,
        displayName: `${request.requester_user_id.slice(0, 8)}...`,
        email: null,
        avatarUrl: null,
      },
    processedBy: request.processed_by_user_id ? (profileMap.get(request.processed_by_user_id) ?? null) : null,
  }));

  const myTeamName = myMembership?.team_id == null ? null : teamMap.get(myMembership.team_id)?.name ?? null;
  const prayerSummaries = prayers.map((prayer) =>
    summarizeChurchPrayer({
      prayerRow: prayer,
      contentRows: prayerContentMap.get(prayer.id) ?? [],
      currentUserId,
      currentUserRole: myRole,
      profileMap,
      teamMap,
    }),
  );

  return {
    church: {
      id: String(church.id),
      name: church.name ?? "",
      description: church.description?.trim() ?? "",
      createdAt: church.created_at ?? "",
      updatedAt: church.updated_at ?? "",
      createdByUserId: church.created_by_user_id ?? "",
      superAdminUserId: church.super_admin_user_id ?? "",
      memberCount: Math.max(0, Math.floor(toNumber(church.member_count, 0))),
      deputyAdminUserIds: parseDeputyAdminUserIds(church.deputy_admin_user_ids),
      myRole,
      myTeamId: myMembership?.team_id == null ? null : String(myMembership.team_id),
      myTeamName,
      isSuperAdmin: myRole === "super_admin",
      isDeputyAdmin: myRole === "deputy_admin",
      canManageMembers: myRole === "super_admin" || myRole === "deputy_admin",
      canManagePlans: myRole === "super_admin" || myRole === "deputy_admin",
      canManageTeams: myRole === "super_admin" || myRole === "deputy_admin",
    },
    members: memberList,
    pendingJoinRequests,
    prayers: prayerSummaries,
    teams: teamSummaries,
    plans: planSummaries.filter((plan) => plan.teamId == null),
  };
}

export async function approveChurchJoinRequest(args: {
  requestId: string;
  churchId: string;
  requesterUserId: string;
  approvedByUserId: string;
  teamId?: string | null;
}) {
  const { requestId, churchId, requesterUserId, approvedByUserId, teamId } = args;
  const supabase = createSupabaseClient();

  const { error: requestError } = await supabase
    .from("church_join_requests")
    .update({
      status: "approved",
      processed_at: new Date().toISOString(),
      processed_by_user_id: approvedByUserId,
    })
    .eq("id", Number(requestId));

  if (requestError) throw requestError;

  const { error: membershipError } = await supabase.from("church_memberships").insert({
    church_id: Number(churchId),
    user_id: requesterUserId,
    role: "member",
    team_id: teamId ? Number(teamId) : null,
    created_by_user_id: approvedByUserId,
  });

  if (membershipError && membershipError.code !== "23505") {
    throw membershipError;
  }
}

export async function rejectChurchJoinRequest(args: {
  requestId: string;
  processedByUserId: string;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("church_join_requests")
    .update({
      status: "rejected",
      processed_at: new Date().toISOString(),
      processed_by_user_id: args.processedByUserId,
    })
    .eq("id", Number(args.requestId));

  if (error) throw error;
}

export async function updateChurchMemberRole(args: {
  churchId: string;
  userId: string;
  role: ChurchRole;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("church_memberships")
    .update({ role: args.role })
    .eq("church_id", Number(args.churchId))
    .eq("user_id", args.userId);

  if (error) throw error;
}

export async function transferChurchSuperAdmin(args: {
  churchId: string;
  targetUserId: string;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("transfer_church_super_admin", {
    p_church_id: Number(args.churchId),
    p_target_user_id: args.targetUserId,
  });

  if (error) throw error;
}

export async function updateChurchMemberTeam(args: {
  churchId: string;
  userId: string;
  teamId?: string | null;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("set_church_member_team", {
    p_church_id: Number(args.churchId),
    p_target_user_id: args.userId,
    p_team_id: args.teamId ? Number(args.teamId) : null,
  });

  if (error) throw error;
}

export async function updateTeamLeader(args: {
  teamId: string;
  leaderUserId?: string | null;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("set_team_leader", {
    p_team_id: Number(args.teamId),
    p_leader_user_id: args.leaderUserId ?? null,
  });

  if (error) throw error;
}

export async function removeChurchMember(args: {
  churchId: string;
  userId: string;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("remove_church_member", {
    p_church_id: Number(args.churchId),
    p_target_user_id: args.userId,
  });

  if (error) throw error;
}

export async function deleteChurchAsSuperAdmin(churchId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("delete_church_as_super_admin", {
    p_church_id: Number(churchId),
  });

  if (error) throw error;
}

export async function createTeam(args: {
  churchId: string;
  name: string;
  createdByUserId: string;
  leaderUserId?: string | null;
}) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      church_id: Number(args.churchId),
      name: args.name.trim(),
      created_by_user_id: args.createdByUserId,
      leader_user_id: args.leaderUserId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String((data as { id: number }).id);
}

export async function createChurchPrayer(args: {
  churchId: string;
  teamId?: string | null;
  currentUserId: string;
  requester: string;
  target: string;
  content: string;
}) {
  const supabase = createSupabaseClient();
  const timestamp = formatDateTime(new Date());

  const { data, error } = await supabase
    .from("church_prayers")
    .insert({
      church_id: Number(args.churchId),
      team_id: args.teamId ? Number(args.teamId) : null,
      requester: args.requester.trim(),
      target: args.target.trim(),
      created_by_user_id: args.currentUserId,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select("id")
    .single();

  if (error) throw error;

  const prayerId = String((data as { id: number }).id);
  const trimmedContent = args.content.trim();

  if (trimmedContent) {
    const { error: contentError } = await supabase.from("church_prayer_contents").insert({
      prayer_id: Number(prayerId),
      created_by_user_id: args.currentUserId,
      content: trimmedContent,
      registered_at: timestamp,
    });

    if (contentError) throw contentError;
  }

  return prayerId;
}

export async function updateChurchPrayer(args: {
  prayerId: string;
  requester: string;
  target: string;
}) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("church_prayers")
    .update({
      requester: args.requester.trim(),
      target: args.target.trim(),
      updated_at: formatDateTime(new Date()),
    })
    .eq("id", Number(args.prayerId));

  if (error) throw error;
}

export async function deleteChurchPrayer(prayerId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("church_prayers").delete().eq("id", Number(prayerId));
  if (error) throw error;
}

export async function addChurchPrayerContent(args: {
  prayerId: string;
  currentUserId: string;
  content: string;
}) {
  const trimmedContent = args.content.trim();
  if (!trimmedContent) return;

  const supabase = createSupabaseClient();
  const { error } = await supabase.from("church_prayer_contents").insert({
    prayer_id: Number(args.prayerId),
    created_by_user_id: args.currentUserId,
    content: trimmedContent,
    registered_at: formatDateTime(new Date()),
  });

  if (error) throw error;
}

export async function deleteChurchPrayerContent(contentId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("church_prayer_contents")
    .delete()
    .eq("id", Number(contentId));

  if (error) throw error;
}

export async function createSharedPlan(args: {
  churchId: string;
  teamId?: string | null;
  currentUserId: string;
  planName: string;
  startDate: string;
  endDate: string;
  selectedBookCodes: string[];
}) {
  const createdAt = formatDateTime(new Date());
  const plan = updatePlanComputedFields({
    id: "",
    planName: args.planName,
    startDate: args.startDate,
    endDate: args.endDate,
    goalStatus: createEmptyGoalStatus(),
    selectedBookCodes: args.selectedBookCodes,
    createdAt,
    updatedAt: createdAt,
    totalReadCount: 0,
    currentReadCount: 0,
    goalPercent: 0,
    readCountPerDay: 0,
    restDay: 0,
    churchId: args.churchId,
    teamId: args.teamId ?? null,
    createdByUserId: args.currentUserId,
    scope: getPlanScope(args.churchId, args.teamId ?? null),
  });

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("plans")
    .insert({
      user_id: args.currentUserId,
      plan_name: plan.planName,
      start_date: plan.startDate,
      end_date: plan.endDate,
      total_read_count: plan.totalReadCount,
      current_read_count: 0,
      goal_percent: 0,
      read_count_per_day: plan.readCountPerDay,
      rest_day: plan.restDay,
      goal_status: createEmptyGoalStatus(),
      selected_book_codes: plan.selectedBookCodes,
      created_at: createdAt,
      updated_at: createdAt,
      church_id: Number(args.churchId),
      team_id: args.teamId ? Number(args.teamId) : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return String((data as { id: number }).id);
}

export async function updateSharedPlan(args: {
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  selectedBookCodes: string[];
}) {
  const supabase = createSupabaseClient();
  const goalStatus = createEmptyGoalStatus();
  const totalReadCount = calcTotalReadCount(args.selectedBookCodes);
  const currentReadCount = calcCurrentReadCount(goalStatus, args.selectedBookCodes);
  const restDay = calcRestDay(args.endDate);
  const readCountPerDay = calcReadCountPerDay(totalReadCount, currentReadCount, restDay);
  const goalPercent = calcGoalPercent(totalReadCount, currentReadCount);

  const { error } = await supabase
    .from("plans")
    .update({
      plan_name: args.planName,
      start_date: args.startDate,
      end_date: args.endDate,
      total_read_count: totalReadCount,
      current_read_count: currentReadCount,
      goal_percent: goalPercent,
      read_count_per_day: readCountPerDay,
      rest_day: restDay,
      selected_book_codes: args.selectedBookCodes,
      updated_at: formatDateTime(new Date()),
    })
    .eq("id", Number(args.planId));

  if (error) throw error;
}

export async function deleteSharedPlan(planId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("plans").delete().eq("id", Number(planId));
  if (error) throw error;
}

export async function fetchSharedPlanDetail(
  churchId: string,
  planId: string,
  currentUserId: string,
): Promise<SharedPlanDetail> {
  const churchDetail = await fetchChurchDetail(churchId, currentUserId);
  const numericPlanId = Number(planId);

  const supabase = createSupabaseClient();
  const { data: planData, error: planError } = await supabase
    .from("plans")
    .select("id, user_id, plan_name, start_date, end_date, selected_book_codes, created_at, updated_at, church_id, team_id")
    .eq("id", numericPlanId)
    .maybeSingle();

  if (planError) throw planError;

  const planRow = planData as SharedPlanRow | null;
  if (!planRow || String(planRow.church_id) !== churchId) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const audienceMembers = churchDetail.members.filter((member) => (planRow.team_id == null ? true : member.teamId === String(planRow.team_id)));
  const { data: progressData, error: progressError } = await supabase
    .from("plan_progresses")
    .select("plan_id, user_id, goal_status, current_read_count, goal_percent, read_count_per_day, rest_day, created_at, updated_at")
    .eq("plan_id", numericPlanId);

  if (progressError) throw progressError;

  const progressRows = (progressData ?? []) as PlanProgressRow[];
  const progressMap = new Map(progressRows.map((row) => [row.user_id, row]));

  const churchProfileMap = new Map(churchDetail.members.map((member) => [member.userId, member.profile]));
  const summary = summarizeSharedPlan({
    planRow,
    progressRows: audienceMembers
      .map((member) => progressMap.get(member.userId))
      .filter((row): row is PlanProgressRow => Boolean(row)),
    currentUserId,
    profileMap: churchProfileMap,
  });

  const memberProgressList = audienceMembers.map((member) => ({
    userId: member.userId,
    role: member.role,
    teamId: member.teamId,
    teamName: member.teamName,
    profile: member.profile,
    plan: createProgressPlanRecord(planRow, progressMap.get(member.userId) ?? null),
  }));

  const myRole = churchDetail.church.myRole;
  const canEditPlan =
    myRole === "super_admin" ||
    (myRole === "deputy_admin" && planRow.team_id != null);
  const myProgress = memberProgressList.find((item) => item.userId === currentUserId) ?? null;

  return {
    church: churchDetail.church,
    team: churchDetail.teams.find((team) => team.id === String(planRow.team_id)) ?? null,
    summary,
    memberProgressList,
    averageGoalPercent: summary.averageGoalPercent,
    myProgress,
    canEditPlan,
    canUpdateMyProgress: Boolean(myProgress),
  };
}

export async function updateSharedPlanProgress(args: {
  planId: string;
  userId: string;
  endDate: string;
  selectedBookCodes: string[];
  goalStatus: GoalStatus;
}) {
  const supabase = createSupabaseClient();
  const totalReadCount = calcTotalReadCount(args.selectedBookCodes);
  const currentReadCount = calcCurrentReadCount(args.goalStatus, args.selectedBookCodes);
  const restDay = calcRestDay(args.endDate);
  const readCountPerDay = calcReadCountPerDay(totalReadCount, currentReadCount, restDay);
  const goalPercent = calcGoalPercent(totalReadCount, currentReadCount);

  const { error } = await supabase
    .from("plan_progresses")
    .update({
      goal_status: args.goalStatus,
      current_read_count: currentReadCount,
      goal_percent: goalPercent,
      read_count_per_day: readCountPerDay,
      rest_day: restDay,
    })
    .eq("plan_id", Number(args.planId))
    .eq("user_id", args.userId);

  if (error) throw error;
}

export async function deleteMyAccount() {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc("delete_my_account");

  if (error) throw error;
}
