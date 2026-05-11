import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanForm } from '@/components/plans/plan-form';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/contexts/toast-context';
import { useChurchActions, useChurchDetail } from '@/hooks/use-churches';
import { useBiblePlanTemplate } from '@/hooks/use-plan-templates';
import { useI18n } from '@/utils/i18n';

export default function AddChurchPlanScreen() {
  const params = useLocalSearchParams<{ id?: string; teamId?: string; templateId?: string }>();
  const churchId = params.id ?? '';
  const teamId = params.teamId ?? null;
  const templateId = useMemo(
    () => (typeof params.templateId === 'string' ? params.templateId : ''),
    [params.templateId],
  );
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { createSharedPlan } = useChurchActions();
  const { churchDetail, isLoading, error } = useChurchDetail(churchId);
  const { template, isLoading: isTemplateLoading } = useBiblePlanTemplate(templateId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading || !churchDetail) {
    return <LoadingScreen message="Loading church..." />;
  }

  if (templateId && isTemplateLoading) {
    return <LoadingScreen message={t('planTemplate.loadingTemplates')} />;
  }

  const team = churchDetail.teams.find((item) => item.id === teamId) ?? null;
  const isForbidden =
    (teamId ? !churchDetail.church.canManagePlans : !churchDetail.church.isSuperAdmin) ||
    (teamId && !team);

  if (isForbidden) {
    return <LoadingScreen message={t('church.planCreateFailed')} />;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader
        title={
          team
            ? t('church.addTeamPlanTitle').replace('{team}', team.name)
            : t('church.addChurchPlanTitle')
        }
        onBack={() => router.back()}
      />

      <PlanForm
        initialValues={
          template
            ? {
                planName: template.templateName,
                planDescription: template.templateExplanation,
                selectedBookCodes: template.selectedBookCodes,
              }
            : undefined
        }
        submitLabel={t('planDrawer.save')}
        isSubmitting={isSubmitting}
        onSubmit={async (values) => {
          setIsSubmitting(true);
          try {
            const planId = await createSharedPlan({
              churchId: churchDetail.church.id,
              teamId,
              planName: values.planName,
              planDescription: values.planDescription,
              startDate: values.startDate,
              endDate: values.endDate,
              selectedBookCodes: values.selectedBookCodes,
            });
            showToast(t('toast.churchPlanCreated'));
            router.replace(
              `/churches/${churchDetail.church.id}/plans/${planId}` as never,
            );
          } catch (createError) {
            showToast(
              createError instanceof Error ? createError.message : t('church.planCreateFailed'),
            );
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
