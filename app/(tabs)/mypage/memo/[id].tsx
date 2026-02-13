import { IconSymbol } from '@/components/ui/icon-symbol';
import { getMemoById, type MemoRecord } from '@/utils/memo-db';
import { useI18n } from '@/utils/i18n';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(raw: string): string {
  if (!raw) return '-';
  const [date, time = ''] = raw.split(' ');
  const [y = '', m = '', d = ''] = date.split('-');
  const hm = time.slice(0, 5);
  return `${y}.${m}.${d} ${hm}`.trim();
}

export default function MemoDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ id?: string }>();
  const memoId = useMemo(() => Number(params.id || 0), [params.id]);
  const [memo, setMemo] = useState<MemoRecord | null>(null);

  useEffect(() => {
    let active = true;
    if (!memoId) {
      setMemo(null);
      return;
    }
    getMemoById(db, memoId).then((row) => {
      if (!active) return;
      setMemo(row);
    });
    return () => {
      active = false;
    };
  }, [db, memoId]);

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
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">{t('mypage.memoDetailTitle')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {!memo ? (
          <Text className="text-gray-500 dark:text-gray-400 mt-6">{t('mypage.memoNotFound')}</Text>
        ) : (
          <>
            <View className="mb-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {memo.title?.trim() ? memo.title : t('mypage.untitled')}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {formatDate(memo.createdAt)}
              </Text>
            </View>

            <View className="mb-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('mypage.verseText')}</Text>
              <Text className="text-base leading-6 text-gray-900 dark:text-white">{memo.verseText}</Text>
            </View>

            <View className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('mypage.content')}</Text>
              <Text className="text-base leading-6 text-gray-900 dark:text-white">
                {memo.content || t('mypage.noContent')}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
