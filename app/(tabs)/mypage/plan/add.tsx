import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanForm } from '@/components/plans/plan-form';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/contexts/toast-context';
import { useBiblePlanTemplate } from '@/hooks/use-plan-templates';
import { addPlan } from '@/utils/plan-db';
import { useI18n } from '@/utils/i18n';

export default function AddPlanScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ templateId?: string }>();
  const templateId = useMemo(
    () => (typeof params.templateId === 'string' ? params.templateId : ''),
    [params.templateId],
  );
  const { template, isLoading } = useBiblePlanTemplate(templateId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (templateId && isLoading) {
    return <LoadingScreen message={t('planTemplate.loadingTemplates')} />;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={t('planDrawer.addTitle')} onBack={() => router.back()} />

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
            const id = await addPlan(
              db,
              values.planName,
              values.planDescription,
              values.startDate,
              values.endDate,
              values.selectedBookCodes,
            );
            showToast(t('toast.planAdded'), '📖');
            router.replace({
              pathname: '/(tabs)/mypage/plan/[id]',
              params: { id: String(id) },
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
