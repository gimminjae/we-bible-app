import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { useI18n } from '@/utils/i18n';

type ChurchInfoSheetMode = 'create' | 'edit';

type ChurchInfoSheetProps = {
  visible: boolean;
  mode: ChurchInfoSheetMode;
  initialName?: string;
  initialDescription?: string;
  initialSharedPlanRankingPublic?: boolean;
  initialSharedPlanProgressPublic?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    description: string;
    sharedPlanRankingPublic?: boolean;
    sharedPlanProgressPublic?: boolean;
  }) => void | Promise<void>;
};

function getSheetTitle(mode: ChurchInfoSheetMode, t: (key: string) => string) {
  return mode === 'create' ? t('church.createTitle') : t('church.editInfoTitle');
}

function getSheetDescription(mode: ChurchInfoSheetMode, t: (key: string) => string) {
  return mode === 'create' ? t('church.createDescription') : t('church.editInfoDescription');
}

function getSubmitLabel(mode: ChurchInfoSheetMode, t: (key: string) => string) {
  return mode === 'create' ? t('church.createButton') : t('church.updateButton');
}

export function ChurchInfoSheet({
  visible,
  mode,
  initialName = '',
  initialDescription = '',
  initialSharedPlanRankingPublic = true,
  initialSharedPlanProgressPublic = true,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ChurchInfoSheetProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [sharedPlanRankingPublic, setSharedPlanRankingPublic] = useState(
    initialSharedPlanRankingPublic,
  );
  const [sharedPlanProgressPublic, setSharedPlanProgressPublic] = useState(
    initialSharedPlanProgressPublic,
  );

  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setDescription(initialDescription);
    setSharedPlanRankingPublic(initialSharedPlanRankingPublic);
    setSharedPlanProgressPublic(initialSharedPlanProgressPublic);
  }, [
    initialDescription,
    initialName,
    initialSharedPlanProgressPublic,
    initialSharedPlanRankingPublic,
    visible,
  ]);

  const submitDisabled = useMemo(() => {
    return isSubmitting || !name.trim();
  }, [isSubmitting, name]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightFraction={mode === 'edit' ? 0.82 : 0.68}
    >
      <View className="flex-1">
        <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {getSheetTitle(mode, t)}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 28 }}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {getSheetDescription(mode, t)}
            </Text>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('church.nameLabel')}
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('church.createPlaceholder')}
                placeholderTextColor="#9ca3af"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('church.descriptionLabel')}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('church.descriptionPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                className="min-h-32 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </View>

            {mode === 'edit' ? (
              <View className="mt-6">
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('church.sharedPlanVisibilityTitle')}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {t('church.sharedPlanVisibilityDescription')}
                </Text>

                <View className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {t('church.sharedPlanRankingVisibilityLabel')}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {sharedPlanRankingPublic
                          ? t('church.sharedPlanRankingVisibilityEnabledHint')
                          : t('church.sharedPlanRankingVisibilityDisabledHint')}
                      </Text>
                    </View>
                    <Switch
                      value={sharedPlanRankingPublic}
                      disabled={isSubmitting}
                      onValueChange={setSharedPlanRankingPublic}
                    />
                  </View>
                </View>

                <View className="mt-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {t('church.sharedPlanProgressVisibilityLabel')}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {sharedPlanProgressPublic
                          ? t('church.sharedPlanProgressVisibilityEnabledHint')
                          : t('church.sharedPlanProgressVisibilityDisabledHint')}
                      </Text>
                    </View>
                    <Switch
                      value={sharedPlanProgressPublic}
                      disabled={isSubmitting}
                      onValueChange={setSharedPlanProgressPublic}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View className="flex-row gap-3 border-t border-gray-200 px-6 pb-5 pt-3 dark:border-gray-800">
            <Button
              onPress={onClose}
              disabled={isSubmitting}
              action="secondary"
              variant="outline"
              className="h-auto flex-1 rounded-2xl border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <ButtonText className="font-semibold text-gray-900 dark:text-white">{t('common.cancel')}</ButtonText>
            </Button>
            <Button
              onPress={() =>
                void onSubmit({
                  name: name.trim(),
                  description: description.trim(),
                  sharedPlanRankingPublic,
                  sharedPlanProgressPublic,
                })
              }
              disabled={submitDisabled}
              className={`h-auto flex-1 rounded-2xl px-4 py-4 ${
                submitDisabled ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
              }`}
            >
              <ButtonText className="font-semibold text-white">{getSubmitLabel(mode, t)}</ButtonText>
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
