import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useI18n } from '@/utils/i18n';

type ChurchInfoSheetMode = 'create' | 'edit';

type ChurchInfoSheetProps = {
  visible: boolean;
  mode: ChurchInfoSheetMode;
  initialName?: string;
  initialDescription?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; description: string }) => void | Promise<void>;
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
  isSubmitting = false,
  onClose,
  onSubmit,
}: ChurchInfoSheetProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setDescription(initialDescription);
  }, [initialDescription, initialName, visible]);

  const submitDisabled = useMemo(() => {
    return isSubmitting || !name.trim();
  }, [isSubmitting, name]);

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.68}>
      <View className="flex-1">
        <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {getSheetTitle(mode, t)}
          </Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 28 }}
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
                autoFocus={visible}
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
          </ScrollView>

          <View className="flex-row gap-3 border-t border-gray-200 px-6 pb-5 pt-3 dark:border-gray-800">
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              className="flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <Text className="font-semibold text-gray-900 dark:text-white">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => void onSubmit({ name: name.trim(), description: description.trim() })}
              disabled={submitDisabled}
              className={`flex-1 items-center justify-center rounded-2xl px-4 py-4 ${
                submitDisabled ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
              }`}
            >
              <Text className="font-semibold text-white">{getSubmitLabel(mode, t)}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </BottomSheet>
  );
}
