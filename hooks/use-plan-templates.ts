import { useAppSettings } from '@/contexts/app-settings';
import { useCustomQuery } from '@/hooks/use-custom-query';
import {
  fetchBiblePlanTemplateById,
  fetchBiblePlanTemplates,
} from '@/lib/plan-template';

const planTemplateKeys = {
  all: (languageCode: string) => ['plan-templates', languageCode] as const,
  detail: (templateId: string) => ['plan-template', templateId] as const,
};

export function useBiblePlanTemplates() {
  const { appLanguage } = useAppSettings();
  const query = useCustomQuery({
    queryKey: planTemplateKeys.all(appLanguage),
    queryFn: () => fetchBiblePlanTemplates(appLanguage),
  });

  return {
    templates: query.data ?? [],
    ...query,
  };
}

export function useBiblePlanTemplate(templateId?: string | null) {
  const normalizedTemplateId = templateId?.trim() ?? '';
  const query = useCustomQuery({
    queryKey: planTemplateKeys.detail(normalizedTemplateId || 'empty'),
    queryFn: () => fetchBiblePlanTemplateById(normalizedTemplateId),
    enabled: Boolean(normalizedTemplateId),
  });

  return {
    template: query.data ?? null,
    ...query,
  };
}
