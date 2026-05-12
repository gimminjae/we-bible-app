import { useLocalSearchParams } from 'expo-router';

import { PlanTemplateSelectionScreen } from '@/components/plans/plan-template-selection-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useChurchDetail } from '@/hooks/use-churches';
import { useI18n } from '@/utils/i18n';

function buildHref(basePath: string, params: Record<string, string | null | undefined>) {
  const search = Object.entries(params)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return search ? `${basePath}?${search}` : basePath;
}

export default function ChurchPlanTemplateScreen() {
  const params = useLocalSearchParams<{ id?: string; teamId?: string }>();
  const churchId = params.id ?? '';
  const teamId = params.teamId ?? null;
  const { t } = useI18n();
  const { churchDetail, isLoading, error } = useChurchDetail(churchId);

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading || !churchDetail) {
    return <LoadingScreen message="Loading church..." />;
  }

  const team = churchDetail.teams.find((item) => item.id === teamId) ?? null;
  const isForbidden =
    (teamId ? !churchDetail.church.canManagePlans : !churchDetail.church.isSuperAdmin) ||
    (teamId && !team);

  if (isForbidden) {
    return <LoadingScreen message={t('church.planCreateFailed')} />;
  }

  const title = team
    ? t('planTemplate.teamSelectTitle').replace('{team}', team.name)
    : t('planTemplate.churchSelectTitle');

  return (
    <PlanTemplateSelectionScreen
      title={title}
      directConfigHref={buildHref(`/churches/${churchId}/plans/add`, { teamId })}
      buildTemplateHref={(templateId) =>
        buildHref(`/churches/${churchId}/plans/add`, { teamId, templateId })
      }
    />
  );
}
