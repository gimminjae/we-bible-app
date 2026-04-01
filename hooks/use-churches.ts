import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/contexts/auth-context';
import {
  addChurchPrayerContent as addChurchPrayerContentRequest,
  approveChurchJoinRequest,
  createChurch as createChurchRequest,
  createChurchPrayer as createChurchPrayerRequest,
  createSharedPlan as createSharedPlanRequest,
  createTeam as createTeamRequest,
  deleteChurchAsSuperAdmin as deleteChurchAsSuperAdminRequest,
  deleteChurchPrayer as deleteChurchPrayerRequest,
  deleteChurchPrayerContent as deleteChurchPrayerContentRequest,
  deleteSharedPlan as deleteSharedPlanRequest,
  fetchChurchDetail,
  fetchMyChurches,
  fetchMySharedPlans,
  fetchSharedPlanDetail,
  rejectChurchJoinRequest,
  removeChurchMember,
  requestChurchJoin,
  searchChurches,
  transferChurchSuperAdmin as transferChurchSuperAdminRequest,
  updateChurchInfo as updateChurchInfoRequest,
  updateChurchMemberRole,
  updateChurchMemberTeam,
  updateChurchPrayer as updateChurchPrayerRequest,
  updateSharedPlan as updateSharedPlanRequest,
  updateSharedPlanProgress as updateSharedPlanProgressRequest,
  updateTeamLeader as updateTeamLeaderRequest,
} from '@/lib/church';
import { useCustomQuery } from '@/hooks/use-custom-query';
import type { GoalStatus } from '@/lib/plan';

const churchKeys = {
  all: ['churches'] as const,
  my: (userId: string) => ['churches', 'my', userId] as const,
  mySharedPlans: (userId: string) => ['churches', 'my-shared-plans', userId] as const,
  search: (userId: string, keyword: string) => ['churches', 'search', userId, keyword] as const,
  detail: (churchId: string, userId: string) => ['churches', 'detail', churchId, userId] as const,
  plan: (churchId: string, planId: string, userId: string) =>
    ['churches', 'plan', churchId, planId, userId] as const,
};

function requireUserId(userId: string | null) {
  if (!userId) {
    throw new Error('AUTH_REQUIRED');
  }

  return userId;
}

export function useMyChurches() {
  const { dataUserId, isConfigured } = useAuth();
  const query = useCustomQuery({
    queryKey: dataUserId ? churchKeys.my(dataUserId) : ['churches', 'my', 'guest'],
    queryFn: () => fetchMyChurches(requireUserId(dataUserId)),
    enabled: Boolean(isConfigured && dataUserId),
  });

  return {
    churches: query.data ?? [],
    ...query,
  };
}

export function useChurchSearch(keyword: string) {
  const { dataUserId, isConfigured } = useAuth();
  const trimmedKeyword = keyword.trim();
  const query = useCustomQuery({
    queryKey: dataUserId
      ? churchKeys.search(dataUserId, trimmedKeyword)
      : ['churches', 'search', 'guest', trimmedKeyword],
    queryFn: () => searchChurches(requireUserId(dataUserId), trimmedKeyword),
    enabled: Boolean(isConfigured && dataUserId && trimmedKeyword),
  });

  return {
    churches: query.data ?? [],
    ...query,
  };
}

export function useMySharedPlans() {
  const { dataUserId, isConfigured } = useAuth();
  const query = useCustomQuery({
    queryKey: dataUserId ? churchKeys.mySharedPlans(dataUserId) : ['churches', 'my-shared-plans', 'guest'],
    queryFn: () => fetchMySharedPlans(requireUserId(dataUserId)),
    enabled: Boolean(isConfigured && dataUserId),
  });

  return {
    sharedPlans: query.data ?? [],
    ...query,
  };
}

export function useChurchDetail(churchId: string) {
  const { dataUserId, isConfigured } = useAuth();
  const query = useCustomQuery({
    queryKey: dataUserId
      ? churchKeys.detail(churchId, dataUserId)
      : ['churches', 'detail', churchId, 'guest'],
    queryFn: () => fetchChurchDetail(churchId, requireUserId(dataUserId)),
    enabled: Boolean(isConfigured && dataUserId && churchId),
  });

  return {
    churchDetail: query.data ?? null,
    ...query,
  };
}

export function useSharedPlanDetail(churchId: string, planId: string) {
  const { dataUserId, isConfigured } = useAuth();
  const query = useCustomQuery({
    queryKey: dataUserId
      ? churchKeys.plan(churchId, planId, dataUserId)
      : ['churches', 'plan', churchId, planId, 'guest'],
    queryFn: () => fetchSharedPlanDetail(churchId, planId, requireUserId(dataUserId)),
    enabled: Boolean(isConfigured && dataUserId && churchId && planId),
  });

  return {
    sharedPlanDetail: query.data ?? null,
    ...query,
  };
}

export function useChurchActions() {
  const queryClient = useQueryClient();
  const { dataUserId } = useAuth();

  return useMemo(() => {
    async function invalidateChurchQueries(churchId?: string, planId?: string) {
      await queryClient.invalidateQueries({ queryKey: churchKeys.all });

      if (churchId && dataUserId) {
        await queryClient.invalidateQueries({ queryKey: churchKeys.detail(churchId, dataUserId) });
      }

      if (churchId && planId && dataUserId) {
        await queryClient.invalidateQueries({ queryKey: churchKeys.plan(churchId, planId, dataUserId) });
      }
    }

    return {
      async createChurch(args: { name: string; description: string }) {
        const churchId = await createChurchRequest(args);
        await invalidateChurchQueries(churchId);
        return churchId;
      },
      async updateChurchInfo(args: { churchId: string; name: string; description: string }) {
        await updateChurchInfoRequest(args);
        await invalidateChurchQueries(args.churchId);
      },
      async requestJoin(churchId: string) {
        await requestChurchJoin(churchId, requireUserId(dataUserId));
        await invalidateChurchQueries(churchId);
      },
      async approveJoinRequest(args: { requestId: string; churchId: string; requesterUserId: string; teamId?: string | null }) {
        await approveChurchJoinRequest({
          requestId: args.requestId,
          churchId: args.churchId,
          requesterUserId: args.requesterUserId,
          approvedByUserId: requireUserId(dataUserId),
          teamId: args.teamId ?? null,
        });
        await invalidateChurchQueries(args.churchId);
      },
      async rejectJoinRequest(args: { requestId: string; churchId: string }) {
        await rejectChurchJoinRequest({
          requestId: args.requestId,
          processedByUserId: requireUserId(dataUserId),
        });
        await invalidateChurchQueries(args.churchId);
      },
      async updateMemberRole(args: { churchId: string; userId: string; role: 'super_admin' | 'deputy_admin' | 'member' }) {
        await updateChurchMemberRole(args);
        await invalidateChurchQueries(args.churchId);
      },
      async transferSuperAdmin(args: { churchId: string; targetUserId: string }) {
        await transferChurchSuperAdminRequest(args);
        await invalidateChurchQueries(args.churchId);
      },
      async updateMemberTeam(args: { churchId: string; userId: string; teamId?: string | null }) {
        await updateChurchMemberTeam(args);
        await invalidateChurchQueries(args.churchId);
      },
      async updateTeamLeader(args: { churchId: string; teamId: string; leaderUserId?: string | null }) {
        await updateTeamLeaderRequest({
          teamId: args.teamId,
          leaderUserId: args.leaderUserId ?? null,
        });
        await invalidateChurchQueries(args.churchId);
      },
      async removeMember(args: { churchId: string; userId: string }) {
        await removeChurchMember(args);
        await invalidateChurchQueries(args.churchId);
      },
      async leaveChurch(churchId: string) {
        const userId = requireUserId(dataUserId);
        await removeChurchMember({
          churchId,
          userId,
        });
        await invalidateChurchQueries(churchId);
      },
      async deleteChurch(churchId: string) {
        await deleteChurchAsSuperAdminRequest(churchId);
        await invalidateChurchQueries(churchId);
      },
      async createTeam(args: { churchId: string; name: string; leaderUserId?: string | null }) {
        const teamId = await createTeamRequest({
          churchId: args.churchId,
          name: args.name,
          leaderUserId: args.leaderUserId ?? null,
          createdByUserId: requireUserId(dataUserId),
        });
        await invalidateChurchQueries(args.churchId);
        return teamId;
      },
      async createChurchPrayer(args: {
        churchId: string;
        teamId?: string | null;
        requester: string;
        target: string;
        content: string;
      }) {
        const prayerId = await createChurchPrayerRequest({
          churchId: args.churchId,
          teamId: args.teamId ?? null,
          currentUserId: requireUserId(dataUserId),
          requester: args.requester,
          target: args.target,
          content: args.content,
        });
        await invalidateChurchQueries(args.churchId);
        return prayerId;
      },
      async updateChurchPrayer(args: {
        churchId: string;
        prayerId: string;
        requester: string;
        target: string;
      }) {
        await updateChurchPrayerRequest({
          prayerId: args.prayerId,
          requester: args.requester,
          target: args.target,
        });
        await invalidateChurchQueries(args.churchId);
      },
      async deleteChurchPrayer(args: { churchId: string; prayerId: string }) {
        await deleteChurchPrayerRequest(args.prayerId);
        await invalidateChurchQueries(args.churchId);
      },
      async addChurchPrayerContent(args: {
        churchId: string;
        prayerId: string;
        content: string;
      }) {
        await addChurchPrayerContentRequest({
          prayerId: args.prayerId,
          currentUserId: requireUserId(dataUserId),
          content: args.content,
        });
        await invalidateChurchQueries(args.churchId);
      },
      async deleteChurchPrayerContent(args: {
        churchId: string;
        contentId: string;
      }) {
        await deleteChurchPrayerContentRequest(args.contentId);
        await invalidateChurchQueries(args.churchId);
      },
      async createSharedPlan(args: {
        churchId: string;
        teamId?: string | null;
        planName: string;
        startDate: string;
        endDate: string;
        selectedBookCodes: string[];
      }) {
        const planId = await createSharedPlanRequest({
          churchId: args.churchId,
          teamId: args.teamId ?? null,
          currentUserId: requireUserId(dataUserId),
          planName: args.planName,
          startDate: args.startDate,
          endDate: args.endDate,
          selectedBookCodes: args.selectedBookCodes,
        });
        await invalidateChurchQueries(args.churchId, planId);
        return planId;
      },
      async updateSharedPlan(args: {
        churchId: string;
        planId: string;
        planName: string;
        startDate: string;
        endDate: string;
        selectedBookCodes: string[];
      }) {
        await updateSharedPlanRequest(args);
        await invalidateChurchQueries(args.churchId, args.planId);
      },
      async deleteSharedPlan(args: { churchId: string; planId: string }) {
        await deleteSharedPlanRequest(args.planId);
        await invalidateChurchQueries(args.churchId, args.planId);
      },
      async updateSharedPlanProgress(args: {
        churchId: string;
        planId: string;
        endDate: string;
        selectedBookCodes: string[];
        goalStatus: GoalStatus;
      }) {
        await updateSharedPlanProgressRequest({
          planId: args.planId,
          userId: requireUserId(dataUserId),
          endDate: args.endDate,
          selectedBookCodes: args.selectedBookCodes,
          goalStatus: args.goalStatus,
        });
        await invalidateChurchQueries(args.churchId, args.planId);
      },
    };
  }, [dataUserId, queryClient]);
}
