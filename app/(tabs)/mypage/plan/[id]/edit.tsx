import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanForm } from '@/components/plans/plan-form';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { ensurePersistedSlicesHydrated } from '@/lib/sqlite-supabase-store';
import { getPlanById, updatePlanInfo } from '@/utils/plan-db';
import { useI18n } from '@/utils/i18n';

export default function EditPlanScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const planId = useMemo(() => Number(params.id || 0), [params.id]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<{
    planName: string;
    planDescription: string;
    startDate: string;
    endDate: string;
    selectedBookCodes: string[];
  } | null>(null);

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)));

  useEffect(() => {
    let active = true;
    if (!planId) {
      setInitialValues(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const loadPlan = async () => {
      if (isAccountDataPending) {
        return;
      }

      try {
        if (currentUser && isConfigured) {
          await ensurePersistedSlicesHydrated(db, currentUser.id, ['plans']);
          if (!active) return;
        }

        const plan = await getPlanById(db, planId);
        if (!active || !plan) return;
        setInitialValues({
          planName: plan.planName,
          planDescription: plan.planDescription,
          startDate: plan.startDate,
          endDate: plan.endDate,
          selectedBookCodes: plan.selectedBookCodes,
        });
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadPlan().catch(() => {
      if (active) {
        setInitialValues(null);
      }
    });

    return () => {
      active = false;
    };
  }, [currentUser, db, isAccountDataPending, isConfigured, planId]);

  if (isLoading) {
    return <LoadingScreen message="Loading plan..." />;
  }

  if (!initialValues) {
    return <LoadingScreen message={t('mypage.planNotFound')} />;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={t('planDrawer.editTitle')} onBack={() => router.back()} />

      <PlanForm
        initialValues={initialValues}
        submitLabel={t('planDrawer.save')}
        isSubmitting={isSubmitting}
        onSubmit={async (values) => {
          setIsSubmitting(true);
          try {
            await updatePlanInfo(
              db,
              planId,
              values.planName,
              values.planDescription,
              values.startDate,
              values.endDate,
              values.selectedBookCodes,
            );
            showToast(t('toast.planUpdated'), '📖');
            router.back();
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
    </SafeAreaView>
  );
}
