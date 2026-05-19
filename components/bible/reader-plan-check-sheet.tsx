import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { PlanChapterSelectionItem } from '@/utils/plan-db';
import { useI18n } from '@/utils/i18n';
import { ScrollView, Text, Pressable, View, ActivityIndicator } from 'react-native';

type ReaderPlanCheckSheetProps = {
  visible: boolean;
  chapterLabel: string;
  plans: PlanChapterSelectionItem[];
  selectedPlanIds: number[];
  isLoading: boolean;
  isSaving: boolean;
  onClose: () => void;
  onTogglePlan: (planId: number) => void;
  onSave: () => Promise<void> | void;
};

export function ReaderPlanCheckSheet({
  visible,
  chapterLabel,
  plans,
  selectedPlanIds,
  isLoading,
  isSaving,
  onClose,
  onTogglePlan,
  onSave,
}: ReaderPlanCheckSheetProps) {
  const { t } = useI18n();

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        if (isSaving) return;
        onClose();
      }}
      heightFraction={0.76}
    >
      <View className="flex-1">
        <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('bibleReader.planCheckTitle')}
          </Text>
          <Text className="mt-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            {chapterLabel}
          </Text>
          <Text className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {t('bibleReader.planCheckDescription').replace('{chapter}', chapterLabel)}
          </Text>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center px-6">
            <ActivityIndicator size="large" color="#6b7280" />
            <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('bibleReader.planCheckLoading')}
            </Text>
          </View>
        ) : plans.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
              {t('bibleReader.planCheckNoPlans')}
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            <Text className="mb-3 px-1 text-xs font-semibold uppercase tracking-[1px] text-gray-400 dark:text-gray-500">
              {t('bibleReader.planCheckSelectionHint').replace(
                '{count}',
                String(selectedPlanIds.length),
              )}
            </Text>

            {plans.map((plan) => {
              const selected = selectedPlanIds.includes(plan.id);
              const readCountText =
                plan.currentChapterReadCount > 0
                  ? t('bibleReader.planCheckReadCount').replace(
                      '{count}',
                      String(plan.currentChapterReadCount),
                    )
                  : null;

              return (
                <Pressable
                  key={plan.id}
                  onPress={() => onTogglePlan(plan.id)}
                  className={`mb-3 rounded-3xl border px-5 py-4 ${
                    selected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                  }`}
                >
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-semibold ${
                          selected
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {plan.planName || t('mypage.planDetailTitle')}
                      </Text>

                      {plan.planDescription ? (
                        <Text
                          className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400"
                          numberOfLines={2}
                        >
                          {plan.planDescription}
                        </Text>
                      ) : null}

                      <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        {plan.currentReadCount} / {plan.totalReadCount}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {plan.startDate} ~ {plan.endDate}
                      </Text>
                    </View>

                    <View className="items-end gap-2">
                      <View
                        className={`h-7 min-w-[28px] items-center justify-center rounded-full px-2 ${
                          selected
                            ? 'bg-primary-500'
                            : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            selected
                              ? 'text-white'
                              : 'text-gray-500 dark:text-gray-300'
                          }`}
                        >
                          {selected ? '✓' : ''}
                        </Text>
                      </View>

                      {readCountText ? (
                        <View className="rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900/30">
                          <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            {readCountText}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <View className="flex-row gap-3">
            <Button
              onPress={onClose}
              disabled={isSaving}
              action="secondary"
              variant="outline"
              className="h-auto flex-1 rounded-2xl border-gray-200 px-4 py-4 dark:border-gray-700"
            >
              <ButtonText className="font-semibold text-gray-900 dark:text-white">
                {t('common.cancel')}
              </ButtonText>
            </Button>

            <Button
              onPress={onSave}
              disabled={isLoading || isSaving || selectedPlanIds.length === 0}
              className="h-auto flex-1 rounded-2xl bg-primary-500 px-4 py-4"
            >
              {isSaving ? <ButtonSpinner color="#ffffff" /> : null}
              <ButtonText className="font-semibold text-white">
                {t('common.confirm')}
              </ButtonText>
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
