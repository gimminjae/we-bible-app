import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useToast } from '@/contexts/toast-context';
import { useLoading } from '@/hooks/use-loading';
import { useI18n } from '@/utils/i18n';
import { addPrayer } from '@/utils/prayer-db';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddPrayerScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [requester, setRequester] = useState('');
  const [relation, setRelation] = useState('');
  const [target, setTarget] = useState('');
  const [content, setContent] = useState('');
  const { isLoading, runWithLoading } = useLoading();

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    await runWithLoading(async () => {
      const id = await addPrayer(db, requester, relation, target, content);
      if (id) {
        showToast(t('toast.prayerAdded'), '🙏');
        router.replace({
          pathname: '/(tabs)/mypage/prayer/[id]',
          params: { id: String(id) },
        });
      } else {
        router.back();
      }
    });
  }, [content, db, relation, requester, router, runWithLoading, showToast, t, target]);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <IconSymbol name="chevron.right" size={18} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
          <Text onPress={() => router.back()} className="text-base text-gray-700 dark:text-gray-300">
            {t('common.back')}
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">
            {t('prayerDrawer.addTitle')}
          </Text>
        </View>
        <Button
          onPress={handleSave}
          disabled={!content.trim() || isLoading}
          className="h-auto rounded-lg bg-primary-500 px-3 py-2 active:opacity-90 disabled:opacity-50"
        >
          {isLoading ? <ButtonSpinner color="#ffffff" /> : null}
          <ButtonText className="text-sm font-semibold text-white">{t('prayerDrawer.save')}</ButtonText>
        </Button>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            {t('prayerDrawer.requesterLabel')}
          </Text>
          <TextInput
            value={requester}
            onChangeText={setRequester}
            placeholder={t('prayerDrawer.requesterPlaceholder')}
            placeholderTextColor="#9ca3af"
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base mb-4"
          />

          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            {t('prayerDrawer.relationLabel')}
          </Text>
          <TextInput
            value={relation}
            onChangeText={setRelation}
            placeholder={t('prayerDrawer.relationPlaceholder')}
            placeholderTextColor="#9ca3af"
            maxLength={50}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base mb-4"
          />

          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            {t('prayerDrawer.targetLabel')}
          </Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            placeholder={t('prayerDrawer.targetPlaceholder')}
            placeholderTextColor="#9ca3af"
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base mb-4"
          />

          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            {t('prayerDrawer.contentLabel')}
          </Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={t('prayerDrawer.contentPlaceholder')}
            placeholderTextColor="#9ca3af"
            multiline
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base"
            style={{ textAlignVertical: 'top', minHeight: 120 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
