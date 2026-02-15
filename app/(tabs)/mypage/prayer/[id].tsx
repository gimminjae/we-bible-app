import { IconSymbol } from '@/components/ui/icon-symbol';
import { useToast } from '@/contexts/toast-context';
import {
  deletePrayer,
  deletePrayerContent,
  getPrayerById,
  type PrayContent,
  type PrayRecord,
} from '@/utils/prayer-db';
import { useI18n } from '@/utils/i18n';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(raw: string): string {
  if (!raw) return '-';
  const [date, time = ''] = raw.split(' ');
  const [y = '', m = '', d = ''] = date.split('-');
  const hm = time.slice(0, 5);
  return `${y}.${m}.${d} ${hm}`.trim();
}

export default function PrayerDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const prayerId = useMemo(() => Number(params.id || 0), [params.id]);
  const [prayer, setPrayer] = useState<PrayRecord | null>(null);

  const load = useCallback(() => {
    let active = true;
    if (!prayerId) {
      setPrayer(null);
      return;
    }
    getPrayerById(db, prayerId).then((row) => {
      if (!active) return;
      setPrayer(row);
    });
    return () => {
      active = false;
    };
  }, [db, prayerId]);

  useFocusEffect(load);

  const handleDeletePrayer = useCallback(() => {
    if (!prayer) return;
    Alert.alert(
      t('mypage.deletePrayerConfirm'),
      '',
      [
        { text: t('mypage.deleteCancel'), style: 'cancel' },
        {
          text: t('mypage.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            await deletePrayer(db, prayer.id);
            showToast(t('toast.prayerDeleted'), '🙏');
            router.back();
          },
        },
      ]
    );
  }, [db, prayer, router, showToast, t]);

  const handleDeleteContent = useCallback(
    (content: PrayContent) => {
      Alert.alert(
        t('mypage.deletePrayerContentConfirm'),
        '',
        [
          { text: t('mypage.deleteCancel'), style: 'cancel' },
          {
            text: t('mypage.deleteConfirm'),
            style: 'destructive',
            onPress: async () => {
              await deletePrayerContent(db, content.id);
              showToast(t('toast.prayerContentDeleted'), '🙏');
              load();
            },
          },
        ]
      );
    },
    [db, load, showToast, t]
  );

  const handleEditPress = useCallback(() => {
    router.push({
      pathname: '/(tabs)/mypage/prayer/[id]/edit',
      params: { id: String(prayerId) },
    });
  }, [router, prayerId]);

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
            {t('mypage.prayerDetailTitle')}
          </Text>
        </View>
        {prayer ? (
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleEditPress}
              className="px-3 py-2 rounded-lg bg-primary-500 active:opacity-90"
            >
              <Text className="text-sm font-semibold text-white">{t('mypage.editPrayer')}</Text>
            </Pressable>
            <Pressable
              onPress={handleDeletePrayer}
              className="px-3 py-2 rounded-lg bg-red-500 active:opacity-90"
            >
              <Text className="text-sm font-semibold text-white">{t('mypage.deletePrayer')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {!prayer ? (
          <Text className="text-gray-500 dark:text-gray-400 mt-6">{t('mypage.prayerNotFound')}</Text>
        ) : (
          <>
            <View className="mb-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('mypage.prayerRequester')}
              </Text>
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {prayer.requester || '-'}
              </Text>
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-3 mb-1">
                {t('mypage.prayerTarget')}
              </Text>
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {prayer.target || '-'}
              </Text>
            </View>

            <View className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                {t('mypage.prayerContent')}
              </Text>
              {prayer.contents.length === 0 ? (
                <Text className="text-gray-500 dark:text-gray-400">{t('mypage.noContent')}</Text>
              ) : (
                prayer.contents.map((content) => (
                  <View
                    key={content.id}
                    className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 last:pb-0"
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text className="text-base leading-6 text-gray-900 dark:text-white">
                          {content.content}
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          {formatDate(content.registeredAt)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeleteContent(content)}
                        hitSlop={8}
                        className="p-2 -mr-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
                      >
                        <IconSymbol name="trash.fill" size={18} color="#6b7280" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
