import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { ChurchProgressBar } from '@/components/churches/church-progress-bar';
import { ChurchRoleBadge } from '@/components/churches/role-badge';
import { SharedPlanProgressSheet } from '@/components/churches/shared-plan-progress-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/contexts/toast-context';
import { useChurchActions, useSharedPlanDetail } from '@/hooks/use-churches';
import { syncPlanGoalStatusToGrass } from '@/services/bible-grass';
import { useI18n } from '@/utils/i18n';
import { setPendingBibleNavigation } from '@/services/bible-state';

export default function ChurchPlanDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; planId?: string }>();
  const churchId = params.id ?? '';
  const planId = params.planId ?? '';
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { sharedPlanDetail, isLoading, error } = useSharedPlanDetail(churchId, planId);
  const { deleteSharedPlan, updateSharedPlanProgress } = useChurchActions();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedMemberProgress = useMemo(
    () => sharedPlanDetail?.memberProgressList.find((item) => item.userId === selectedUserId) ?? null,
    [selectedUserId, sharedPlanDetail],
  );
  const canViewAllRanking = sharedPlanDetail?.visibility.canViewAllRanking ?? false;
  const canViewAllProgress = sharedPlanDetail?.visibility.canViewAllProgress ?? false;

  const visibleMemberProgressList = useMemo(() => {
    if (!sharedPlanDetail) return [];

    const next = [...sharedPlanDetail.memberProgressList];
    if (sharedPlanDetail.visibility.canViewAllRanking) {
      next.sort((left, right) => {
        const rankDiff = left.rank - right.rank;
        if (rankDiff !== 0) return rankDiff;
        return left.profile.displayName.localeCompare(right.profile.displayName, 'ko');
      });
      return next;
    }

    return next;
  }, [sharedPlanDetail]);

  const visibleTeamProgressList = useMemo(() => {
    if (!sharedPlanDetail) return [];

    const next = [...sharedPlanDetail.teamProgressList];
    if (sharedPlanDetail.visibility.canViewAllRanking) {
      next.sort((left, right) => {
        const rankDiff = left.rank - right.rank;
        if (rankDiff !== 0) return rankDiff;
        return left.teamName.localeCompare(right.teamName, 'ko');
      });
      return next;
    }

    next.sort((left, right) => left.teamName.localeCompare(right.teamName, 'ko'));
    return next;
  }, [sharedPlanDetail]);

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading || !sharedPlanDetail) {
    return <LoadingScreen message="Loading plan..." />;
  }

  const handleMemberPress = (userId: string, canOpenDetail: boolean) => {
    if (!canOpenDetail) {
      showToast(t('church.planProgressPrivateMessage'));
      return;
    }

    setSelectedUserId(userId);
  };

  const handleDeletePlan = () => {
    Alert.alert('', t('mypage.deletePlanConfirm'), [
      { text: t('mypage.deleteCancel'), style: 'cancel' },
      {
        text: t('mypage.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteSharedPlan({ churchId, planId });
              showToast(t('toast.churchPlanDeleted'));
              router.replace(`/churches/${churchId}` as never);
            } catch (deleteError) {
              showToast(
                deleteError instanceof Error ? deleteError.message : t('church.planDeleteFailed'),
              );
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader
        title={sharedPlanDetail.summary.planName || t('church.planDetailTitle')}
        onBack={() => router.back()}
        right={
          sharedPlanDetail.canEditPlan ? (
            <>
              <Button
                onPress={() =>
                  router.push(`/churches/${churchId}/plans/${planId}/edit` as never)
                }
                className="h-auto rounded-2xl bg-primary-500 px-4 py-3"
              >
                <ButtonText className="font-semibold text-white">{t('mypage.editPlan')}</ButtonText>
              </Button>
              <Button
                onPress={handleDeletePlan}
                action="negative"
                variant="outline"
                className="h-auto rounded-2xl border-red-200 px-4 py-3 dark:border-red-900"
              >
                <ButtonText className="font-semibold text-red-500">{t('mypage.deletePlan')}</ButtonText>
              </Button>
            </>
          ) : null
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-sm text-gray-500 dark:text-gray-400">{t('church.planScope')}</Text>
          <Text className="mt-2 text-base text-gray-900 dark:text-white">
            {sharedPlanDetail.team
              ? t('church.teamPlanScope').replace('{team}', sharedPlanDetail.team.name)
              : t('church.churchPlanScope')}
          </Text>
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {sharedPlanDetail.summary.startDate} ~ {sharedPlanDetail.summary.endDate}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('church.planCreatedBy').replace('{name}', sharedPlanDetail.summary.createdByName)}
          </Text>
        </View>

        {sharedPlanDetail.summary.planDescription ? (
          <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('planDrawer.planDescriptionLabel')}
            </Text>
            <Text className="mt-2 text-base leading-7 text-gray-900 dark:text-white">
              {sharedPlanDetail.summary.planDescription}
            </Text>
          </View>
        ) : null}

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('church.averageProgress')}
            </Text>
            <Text className="mt-3 text-2xl font-bold text-primary-600 dark:text-primary-400">
              {canViewAllProgress
                ? `${sharedPlanDetail.averageGoalPercent.toFixed(2)}%`
                : t('church.privateValue')}
            </Text>
            <ChurchProgressBar
              value={sharedPlanDetail.averageGoalPercent}
              hidden={!canViewAllProgress}
              size="md"
              className="mt-4"
            />
          </View>
          <View className="flex-1 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t('church.myProgress')}</Text>
            <Text className="mt-3 text-2xl font-bold text-primary-600 dark:text-primary-400">
              {sharedPlanDetail.myProgress
                ? `${sharedPlanDetail.myProgress.plan.goalPercent.toFixed(2)}%`
                : '-'}
            </Text>
            <ChurchProgressBar
              value={sharedPlanDetail.myProgress?.plan.goalPercent ?? 0}
              size="md"
              tone="emerald"
              className="mt-4"
            />
          </View>
        </View>

        {!canViewAllProgress || !canViewAllRanking ? (
          <View className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
            <Text className="text-sm leading-6 text-amber-700 dark:text-amber-200">
              {!canViewAllProgress && !canViewAllRanking
                ? t('church.planProgressAndRankingPrivateHint')
                : !canViewAllProgress
                  ? t('church.planProgressPrivateHint')
                  : t('church.planRankingPrivateHint')}
            </Text>
          </View>
        ) : null}

        {visibleTeamProgressList.length > 0 && (canViewAllRanking || canViewAllProgress) ? (
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {t('church.teamRankingList')}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {visibleTeamProgressList.length}
              </Text>
            </View>

            {visibleTeamProgressList.map((team) => (
              <View
                key={team.teamId}
                className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-white">{team.teamName}</Text>
                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {t('church.memberCount').replace('{count}', String(team.memberCount))}
                    </Text>
                  </View>
                  <View className="items-end gap-2">
                    {canViewAllRanking ? (
                      <View className="rounded-2xl bg-amber-100 px-3 py-2 dark:bg-amber-950/40">
                        <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {t('church.rankLabel').replace('{rank}', String(team.rank))}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      className={`text-sm font-semibold ${
                        canViewAllProgress
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {canViewAllProgress
                        ? `${team.averageGoalPercent.toFixed(1)}%`
                        : t('church.privateValue')}
                    </Text>
                  </View>
                </View>
                <ChurchProgressBar
                  value={team.averageGoalPercent}
                  hidden={!canViewAllProgress}
                  className="mt-4"
                />
              </View>
            ))}
          </View>
        ) : null}

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t('church.memberProgressList')}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {visibleMemberProgressList.length}
            </Text>
          </View>

          {visibleMemberProgressList.map((member) => {
            const canOpenDetail =
              canViewAllProgress || sharedPlanDetail.myProgress?.userId === member.userId;
            const canShowProgress =
              canViewAllProgress || sharedPlanDetail.myProgress?.userId === member.userId;
            const canShowRankBadge = canViewAllRanking && member.rank <= 10;

            return (
              <Pressable
                key={member.userId}
                onPress={() => handleMemberPress(member.userId, canOpenDetail)}
                className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                accessibilityState={{ disabled: !canOpenDetail }}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-semibold text-gray-900 dark:text-white">
                        {member.profile.displayName}
                        {sharedPlanDetail.myProgress?.userId === member.userId
                          ? ` · ${t('church.me')}`
                          : ''}
                      </Text>
                      <ChurchRoleBadge role={member.role} />
                    </View>
                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {member.teamName
                        ? `${t('church.teamLabel')} ${member.teamName}`
                        : t('church.noTeamAssigned')}
                    </Text>
                  </View>
                  <View className="items-end gap-2">
                    {canShowRankBadge ? (
                      <View className="rounded-2xl bg-amber-100 px-3 py-2 dark:bg-amber-950/40">
                        <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {t('church.rankLabel').replace('{rank}', String(member.rank))}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      className={`text-sm font-semibold ${
                        canShowProgress
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {canShowProgress
                        ? `${member.plan.goalPercent.toFixed(1)}%`
                        : t('church.privateValue')}
                    </Text>
                  </View>
                </View>
                <ChurchProgressBar
                  value={member.plan.goalPercent}
                  hidden={!canShowProgress}
                  className="mt-4"
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <SharedPlanProgressSheet
        visible={Boolean(selectedMemberProgress)}
        onClose={() => setSelectedUserId(null)}
        memberProgress={selectedMemberProgress}
        canEdit={Boolean(
          selectedMemberProgress &&
            sharedPlanDetail.myProgress?.userId === selectedMemberProgress.userId &&
            sharedPlanDetail.canUpdateMyProgress,
        )}
        onSave={async (goalStatus) => {
          if (!selectedMemberProgress || sharedPlanDetail.myProgress?.userId !== selectedMemberProgress.userId) {
            return;
          }

          try {
            const previousGoalStatus = selectedMemberProgress.plan.goalStatus.map((row) => [...row]);
            await updateSharedPlanProgress({
              churchId,
              planId,
              endDate: sharedPlanDetail.summary.endDate,
              selectedBookCodes: sharedPlanDetail.summary.selectedBookCodes,
              goalStatus,
            });
            await syncPlanGoalStatusToGrass(
              db,
              sharedPlanDetail.summary.selectedBookCodes,
              previousGoalStatus,
              goalStatus,
            );
            showToast(t('toast.churchPlanProgressUpdated'));
          } catch (saveError) {
            showToast(
              saveError instanceof Error ? saveError.message : t('church.planProgressUpdateFailed'),
            );
          }
        }}
        onChapterLongPress={async (bookCode, chapter) => {
          await setPendingBibleNavigation(db, { bookCode, chapter });
          router.replace('/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}
