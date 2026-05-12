import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/ui/screen-header';
import { useBiblePlanTemplates } from '@/hooks/use-plan-templates';
import { calcTotalReadCount } from '@/lib/plan';
import { useI18n } from '@/utils/i18n';

type PlanTemplateSelectionScreenProps = {
  title: string;
  directConfigHref: string;
  buildTemplateHref: (templateId: string) => string;
};

export function PlanTemplateSelectionScreen({
  title,
  directConfigHref,
  buildTemplateHref,
}: PlanTemplateSelectionScreenProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { templates, isLoading, error } = useBiblePlanTemplates();

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={title} onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.push(directConfigHref as never)}
          className="mb-6 rounded-3xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-900/60 dark:bg-primary-950/40"
        >
          <Text className="text-base font-semibold text-primary-700 dark:text-primary-300">
            {t('planTemplate.directConfigLabel')}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-primary-700/80 dark:text-primary-200/80">
            {t('planTemplate.directConfigDescription')}
          </Text>
        </Pressable>

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {t('planTemplate.templateSectionTitle')}
          </Text>
          {!isLoading && !error ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400">{templates.length}</Text>
          ) : null}
        </View>

        {isLoading ? (
          <View className="rounded-3xl border border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
            <ActivityIndicator color="#3b82f6" />
            <Text className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('planTemplate.loadingTemplates')}
            </Text>
          </View>
        ) : error ? (
          <View className="rounded-3xl border border-red-200 bg-white px-5 py-6 dark:border-red-900 dark:bg-gray-900">
            <Text className="text-sm font-semibold text-red-500">
              {t('planTemplate.templateLoadFailed')}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {error.message}
            </Text>
          </View>
        ) : templates.length === 0 ? (
          <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('planTemplate.emptyTemplates')}
            </Text>
          </View>
        ) : (
          templates.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => router.push(buildTemplateHref(template.id) as never)}
              className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                    {template.templateName}
                  </Text>
                  {template.templateExplanation ? (
                    <Text
                      className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400"
                      numberOfLines={3}
                    >
                      {template.templateExplanation}
                    </Text>
                  ) : null}
                </View>
                <Text className="rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {t('planTemplate.templateBadge')}
                </Text>
              </View>

              <Text className="mt-4 text-sm font-medium text-primary-600 dark:text-primary-400">
                {t('planTemplate.templateStats')
                  .replace('{books}', String(template.selectedBookCodes.length))
                  .replace('{chapters}', String(calcTotalReadCount(template.selectedBookCodes)))}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
