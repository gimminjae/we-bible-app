import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useToast } from '@/contexts/toast-context';
import { useLoading } from '@/hooks/use-loading';
import { useI18n } from '@/utils/i18n';
import {
  addPrayerContent,
  persistPrayers,
  getPrayerById,
  updatePrayer,
  updatePrayerContent,
  deletePrayerContent,
} from '@/utils/prayer-db';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ContentItem = { id?: number; content: string; registeredAt: string };

export default function EditPrayerScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const prayerId = useMemo(() => Number(params.id || 0), [params.id]);
  const [requester, setRequester] = useState('');
  const [relation, setRelation] = useState('');
  const [target, setTarget] = useState('');
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const { isLoading, runWithLoading } = useLoading();

  useEffect(() => {
    let active = true;
    if (!prayerId) return;
    getPrayerById(db, prayerId).then((row) => {
      if (!active || !row) return;
      setRequester(row.requester);
      setRelation(row.relation);
      setTarget(row.target);
      setContents(
        row.contents.map((c) => ({
          id: c.id,
          content: c.content,
          registeredAt: c.registeredAt,
        }))
      );
    });
    return () => {
      active = false;
    };
  }, [db, prayerId]);

  const handleAddContent = useCallback(() => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    setContents((prev) => [...prev, { content: '', registeredAt: now }]);
  }, []);

  const handleUpdateContent = useCallback((index: number, content: string) => {
    setContents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], content };
      return next;
    });
  }, []);

  const handleDeleteContent = useCallback((index: number) => {
    setContents((prev) => {
      const item = prev[index];
      if (item.id) {
        setDeletedIds((ids) => [...ids, item.id!]);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!prayerId) return;
    await runWithLoading(async () => {
      await updatePrayer(db, prayerId, requester, relation, target, { skipPersist: true });
      for (const id of deletedIds) {
        await deletePrayerContent(db, id, { skipPersist: true });
      }
      for (const item of contents) {
        if (item.id) {
          await updatePrayerContent(db, item.id, item.content, { skipPersist: true });
        } else if (item.content.trim()) {
          await addPrayerContent(db, prayerId, item.content, { skipPersist: true });
        }
      }
      await persistPrayers(db);
      showToast(t('toast.prayerUpdated'), '🙏');
      router.back();
    });
  }, [contents, db, deletedIds, prayerId, relation, requester, router, runWithLoading, showToast, t, target]);

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
            {t('prayerDrawer.editTitle')}
          </Text>
        </View>
        <Button
          onPress={handleSave}
          disabled={isLoading}
          className="h-auto rounded-lg bg-primary-500 px-3 py-2 active:opacity-90"
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

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('prayerDrawer.contentLabel')}
            </Text>
            <Button
              onPress={handleAddContent}
              size="sm"
              className="h-auto rounded-lg bg-primary-500 px-3 py-1.5 active:opacity-90"
            >
              <ButtonText className="text-sm font-semibold text-white">{t('prayerDrawer.addContent')}</ButtonText>
            </Button>
          </View>

          {contents.map((item, index) => (
            <View
              key={item.id ?? `new-${index}`}
              className="mb-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-start gap-2">
                <TextInput
                  value={item.content}
                  onChangeText={(text) => handleUpdateContent(index, text)}
                  placeholder={t('prayerDrawer.contentPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  multiline
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base"
                  style={{ textAlignVertical: 'top', minHeight: 80 }}
                />
                <Pressable
                  onPress={() => handleDeleteContent(index)}
                  hitSlop={8}
                  className="p-2 rounded-lg active:bg-gray-200 dark:active:bg-gray-700"
                >
                  <IconSymbol name="trash.fill" size={20} color="#6b7280" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
