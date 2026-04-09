import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { ChurchRoleBadge } from '@/components/churches/role-badge';
import { SharedPlanProgressSheet } from '@/components/churches/shared-plan-progress-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/contexts/toast-context';
import { useChurchActions, useSharedPlanDetail } from '@/hooks/use-churches';
import { syncPlanGoalStatusToGrass } from '@/utils/grass-db';
import { useI18n } from '@/utils/i18n';

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

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading || !sharedPlanDetail) {
    return <LoadingScreen message="Loading plan..." />;
  }

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

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('church.averageProgress')}
            </Text>
            <Text className="mt-3 text-2xl font-bold text-primary-600 dark:text-primary-400">
              {sharedPlanDetail.averageGoalPercent.toFixed(2)}%
            </Text>
          </View>
          <View className="flex-1 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t('church.myProgress')}</Text>
            <Text className="mt-3 text-2xl font-bold text-primary-600 dark:text-primary-400">
              {sharedPlanDetail.myProgress
                ? `${sharedPlanDetail.myProgress.plan.goalPercent.toFixed(2)}%`
                : '-'}
            </Text>
          </View>
        </View>

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t('church.memberProgressList')}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {sharedPlanDetail.memberProgressList.length}
            </Text>
          </View>

          {sharedPlanDetail.memberProgressList.map((member) => (
            <Pressable
              key={member.userId}
              onPress={() => setSelectedUserId(member.userId)}
              className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
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
                <View className="rounded-2xl bg-primary-100 px-3 py-2 dark:bg-primary-950/40">
                  <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {member.plan.goalPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
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
      />
    </SafeAreaView>
  );
}
