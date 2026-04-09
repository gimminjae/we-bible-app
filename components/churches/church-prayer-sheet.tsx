import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { SelectionSheet, type SelectionOption } from '@/components/ui/selection-sheet';
import type { ChurchPrayer } from '@/lib/church';
import { useI18n } from '@/utils/i18n';

export type ChurchPrayerAudienceOption = SelectionOption;

type ChurchPrayerSheetMode = 'create' | 'edit' | 'append';

type ChurchPrayerSheetProps = {
  visible: boolean;
  mode: ChurchPrayerSheetMode;
  onClose: () => void;
  onSubmit: (input: {
    teamId: string | null;
    requester: string;
    target: string;
    content: string;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
  prayer?: ChurchPrayer | null;
  audienceOptions?: ChurchPrayerAudienceOption[];
  initialAudienceValue?: string;
};

function getPrayerSheetTitle(mode: ChurchPrayerSheetMode, t: (key: string) => string) {
  if (mode === 'edit') return t('church.editPrayerTitle');
  if (mode === 'append') return t('church.appendPrayerContentTitle');
  return t('church.createPrayerTitle');
}

export function ChurchPrayerSheet({
  visible,
  mode,
  onClose,
  onSubmit,
  isSubmitting = false,
  prayer = null,
  audienceOptions = [],
  initialAudienceValue = '',
}: ChurchPrayerSheetProps) {
  const { t } = useI18n();
  const [audienceValue, setAudienceValue] = useState(initialAudienceValue);
  const [requester, setRequester] = useState(prayer?.requester ?? '');
  const [target, setTarget] = useState(prayer?.target ?? '');
  const [content, setContent] = useState('');
  const [audienceSheetVisible, setAudienceSheetVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAudienceValue(initialAudienceValue);
    setRequester(prayer?.requester ?? '');
    setTarget(prayer?.target ?? '');
    setContent('');
  }, [initialAudienceValue, prayer, visible]);

  const saveDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (mode === 'append') return !content.trim();
    if (mode === 'create') return !content.trim();
    return false;
  }, [content, isSubmitting, mode]);

  const showAudienceSelect = mode === 'create' && audienceOptions.length > 1;
  const showMetaFields = mode !== 'append';
  const currentAudienceLabel =
    audienceOptions.find((option) => option.value === audienceValue)?.label ??
    audienceOptions[0]?.label ??
    '';

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} heightFraction={0.85}>
        <View className="flex-1">
          <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {getPrayerSheetTitle(mode, t)}
            </Text>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24 }}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {showAudienceSelect ? (
              <View className="mb-5">
                <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('church.prayerAudienceLabel')}
                </Text>
                <Button
                  onPress={() => setAudienceSheetVisible(true)}
                  action="secondary"
                  variant="outline"
                  className="h-auto rounded-2xl border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  <ButtonText className="text-base text-gray-900 dark:text-white">{currentAudienceLabel}</ButtonText>
                </Button>
              </View>
            ) : null}

            {mode !== 'create' && prayer ? (
              <View className="mb-5 rounded-2xl border border-gray-200 bg-gray-100 px-4 py-4 dark:border-gray-800 dark:bg-gray-800">
                <Text className="font-semibold text-gray-900 dark:text-white">
                  {prayer.scope === 'team'
                    ? t('church.teamPrayerScopeLabel').replace('{team}', prayer.teamName ?? '-')
                    : t('church.churchPrayerScopeLabel')}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('church.prayerCreatedBy').replace('{name}', prayer.createdByName)}
                </Text>
              </View>
            ) : null}

            {showMetaFields ? (
              <>
                <View className="mb-5">
                  <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('prayerDrawer.requesterLabel')}
                  </Text>
                  <TextInput
                    value={requester}
                    onChangeText={setRequester}
                    placeholder={t('prayerDrawer.requesterPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </View>

                <View className="mb-5">
                  <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('prayerDrawer.targetLabel')}
                  </Text>
                  <TextInput
                    value={target}
                    onChangeText={setTarget}
                    placeholder={t('prayerDrawer.targetPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </View>
              </>
            ) : null}

            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                {mode === 'edit' ? t('church.prayerNewContentLabel') : t('prayerDrawer.contentLabel')}
              </Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                placeholder={
                  mode === 'edit'
                    ? t('church.prayerNewContentPlaceholder')
                    : t('prayerDrawer.contentPlaceholder')
                }
                placeholderTextColor="#9ca3af"
                className="min-h-36 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </View>

            <View className="flex-row gap-3">
              <Button
                onPress={onClose}
                disabled={isSubmitting}
                action="secondary"
                variant="outline"
                className="h-auto flex-1 rounded-2xl border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <ButtonText className="font-semibold text-gray-900 dark:text-white">
                  {t('prayerDrawer.cancel')}
                </ButtonText>
              </Button>
              <Button
                onPress={() =>
                  void onSubmit({
                    teamId: audienceValue || null,
                    requester,
                    target,
                    content,
                  })
                }
                disabled={saveDisabled}
                className={`h-auto flex-1 rounded-2xl px-4 py-4 ${
                  saveDisabled ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
                }`}
              >
                <ButtonText className="font-semibold text-white">{t('prayerDrawer.save')}</ButtonText>
              </Button>
            </View>
          </ScrollView>
        </View>
      </BottomSheet>

      <SelectionSheet
        visible={audienceSheetVisible}
        title={t('church.prayerAudienceLabel')}
        value={audienceValue}
        options={audienceOptions}
        onClose={() => setAudienceSheetVisible(false)}
        onSelect={setAudienceValue}
      />
    </>
  );
}
