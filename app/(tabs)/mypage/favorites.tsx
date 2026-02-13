import { getAllFavorites } from '@/utils/favorite-verses-db';
import type { FavoriteVerseRecord } from '@/components/bible/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(raw: string): string {
  if (!raw) return '-';
  const [date, time = ''] = raw.split(' ');
  const [y = '', m = '', d = ''] = date.split('-');
  const hm = time.slice(0, 5);
  return `${y}.${m}.${d} ${hm}`.trim();
}

export default function FavoriteListScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [items, setItems] = useState<FavoriteVerseRecord[]>([]);

  const load = useCallback(() => {
    let active = true;
    getAllFavorites(db).then((rows) => {
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
          뒤로
        </Text>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">관심 성경 구절</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400 mt-6">등록된 관심 구절이 없습니다.</Text>
        ) : (
          items.map((item, idx) => (
            <View
              key={`${item.bookCode}:${item.chapter}:${item.verse}:${idx}`}
              className="mb-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <Text className="text-base text-gray-900 dark:text-white leading-6">{item.verseText}</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {formatDate(item.createdAt)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
