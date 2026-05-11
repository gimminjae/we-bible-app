import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanForm } from '@/components/plans/plan-form';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/contexts/toast-context';
import { useChurchActions, useSharedPlanDetail } from '@/hooks/use-churches';
import { useI18n } from '@/utils/i18n';

export default function EditChurchPlanScreen() {
  const params = useLocalSearchParams<{ id?: string; planId?: string }>();
  const churchId = params.id ?? '';
  const planId = params.planId ?? '';
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { updateSharedPlan } = useChurchActions();
  const { sharedPlanDetail, isLoading, error } = useSharedPlanDetail(churchId, planId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading || !sharedPlanDetail) {
    return <LoadingScreen message="Loading plan..." />;
  }

  if (!sharedPlanDetail.canEditPlan) {
    return <LoadingScreen message={t('church.planUpdateFailed')} />;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={t('church.editPlanTitle')} onBack={() => router.back()} />

      <PlanForm
        initialValues={{
          planName: sharedPlanDetail.summary.planName,
          planDescription: sharedPlanDetail.summary.planDescription,
          startDate: sharedPlanDetail.summary.startDate,
          endDate: sharedPlanDetail.summary.endDate,
          selectedBookCodes: sharedPlanDetail.summary.selectedBookCodes,
        }}
        submitLabel={t('planDrawer.save')}
        isSubmitting={isSubmitting}
        onSubmit={async (values) => {
          setIsSubmitting(true);
          try {
            await updateSharedPlan({
              churchId,
              planId,
              planName: values.planName,
              planDescription: values.planDescription,
              startDate: values.startDate,
              endDate: values.endDate,
              selectedBookCodes: values.selectedBookCodes,
            });
            showToast(t('toast.churchPlanUpdated'));
            router.replace(`/churches/${churchId}/plans/${planId}` as never);
          } catch (updateError) {
            showToast(
              updateError instanceof Error ? updateError.message : t('church.planUpdateFailed'),
            );
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
