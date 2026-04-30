import { PlanTemplateSelectionScreen } from '@/components/plans/plan-template-selection-screen';
import { useI18n } from '@/utils/i18n';

export default function PersonalPlanTemplateScreen() {
  const { t } = useI18n();

  return (
    <PlanTemplateSelectionScreen
      title={t('planTemplate.personalSelectTitle')}
      directConfigHref="/(tabs)/mypage/plan/add"
      buildTemplateHref={(templateId) =>
        `/(tabs)/mypage/plan/add?templateId=${encodeURIComponent(templateId)}`
      }
    />
  );
}
