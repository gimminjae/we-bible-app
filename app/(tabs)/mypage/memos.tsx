import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAllMemos, type MemoRecord } from '@/utils/memo-db';
import { useI18n } from '@/utils/i18n';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(raw: string): string {
  if (!raw) return '-';
  const [date, time = ''] = raw.split(' ');
  const [y = '', m = '', d = ''] = date.split('-');
  const hm = time.slice(0, 5);
  return `${y}.${m}.${d} ${hm}`.trim();
}

export default function MemoListScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<MemoRecord[]>([]);

  const load = useCallback(() => {
    let active = true;
    getAllMemos(db).then((rows) => {
      if (!active) return;
      setItems(rows);
    });
    return () => {
      active = false;
    };
  }, [db]);

  useFocusEffect(load);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View className="px-4 pt-4 pb-3 flex-row items-center gap-3">
        <IconSymbol name="chevron.right" size={18} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
        <Text onPress={() => router.back()} className="text-base text-gray-700 dark:text-gray-300">
          {t('common.back')}
        </Text>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">{t('mypage.memosTitle')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400 mt-6">{t('mypage.emptyMemos')}</Text>
        ) : (
          items.map((item) => {
            const titleText = item.title?.trim() ? item.title : item.verseText;
            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/mypage/memo/[id]',
                    params: { id: String(item.id) },
                  })
                }
                className="mb-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              >
                <Text numberOfLines={2} className="text-base text-gray-900 dark:text-white leading-6">
                  {titleText || t('mypage.untitled')}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(item.createdAt)}
                  </Text>
                  <IconSymbol name="chevron.right" size={16} color="#9ca3af" />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
