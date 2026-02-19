import { MemoDrawer } from '@/components/bible/memo-drawer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { addMemoWithoutVerse, getAllMemos, type MemoRecord } from '@/utils/memo-db';
import { useI18n } from '@/utils/i18n';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useResponsive } from '@/hooks/use-responsive';
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
  const { scale, moderateScale } = useResponsive();
  const [items, setItems] = useState<MemoRecord[]>([]);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

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

  const handleOpenCreateDrawer = useCallback(() => {
    setShowCreateDrawer(true);
  }, []);

  const handleCloseCreateDrawer = useCallback(() => {
    setShowCreateDrawer(false);
  }, []);

  const handleSaveDirectMemo = useCallback(
    async (title: string, content: string) => {
      await addMemoWithoutVerse(db, title, content);
      const rows = await getAllMemos(db);
      setItems(rows);
    },
    [db]
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View
        className="flex-row items-center"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(12),
          gap: scale(12),
        }}
      >
        <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
        <Text onPress={() => router.back()} className="text-gray-700 dark:text-gray-300" style={{ fontSize: moderateScale(16) }}>
          {t('common.back')}
        </Text>
        <Text className="font-bold text-gray-900 dark:text-white" style={{ fontSize: moderateScale(18), marginLeft: scale(8) }}>{t('mypage.memosTitle')}</Text>
        <View className="flex-1 items-end">
          <Pressable
            onPress={handleOpenCreateDrawer}
            className="px-3 py-2 rounded-lg bg-primary-500 active:opacity-90"
          >
            <Text className="text-sm font-semibold text-white">{t('mypage.writeMemo')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(24) }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400" style={{ marginTop: scale(24) }}>{t('mypage.emptyMemos')}</Text>
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
                className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                style={{ marginBottom: scale(12), paddingHorizontal: scale(16), paddingVertical: scale(12) }}
              >
                <Text numberOfLines={2} className="text-gray-900 dark:text-white" style={{ fontSize: moderateScale(16), lineHeight: moderateScale(24) }}>
                  {titleText || t('mypage.untitled')}
                </Text>
                <View className="flex-row items-center justify-between" style={{ marginTop: scale(8) }}>
                  <Text className="text-gray-500 dark:text-gray-400" style={{ fontSize: moderateScale(14) }}>
                    {formatDate(item.createdAt)}
                  </Text>
                  <IconSymbol name="chevron.right" size={moderateScale(16)} color="#9ca3af" />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <MemoDrawer
        isOpen={showCreateDrawer}
        onClose={handleCloseCreateDrawer}
        initialVerseText=""
        onSave={(title, content) => {
          void handleSaveDirectMemo(title, content);
        }}
      />
    </SafeAreaView>
  );
}
