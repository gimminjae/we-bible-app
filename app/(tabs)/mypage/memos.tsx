import { MemoDrawer } from '@/components/bible/memo-drawer';
import { Button, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useResponsive } from '@/hooks/use-responsive';
import { ensurePersistedSlicesHydrated } from '@/lib/sqlite-supabase-store';
import { copyToClipboard } from '@/utils/clipboard';
import { useI18n } from '@/utils/i18n';
import { addMemoWithoutVerse, getAllMemos, type MemoRecord } from '@/utils/memo-db';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
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

function buildMemoCopyText(memo: MemoRecord, t: (k: string) => string): string {
  const title = memo.title?.trim() || t('mypage.untitled');
  const verse = memo.verseText?.trim() || '';
  const content = memo.content?.trim() || '';
  const lines = [
    `${title}`,
    verse ? `${verse}` : null,
    `${content}`,
  ].filter(Boolean);
  return lines.join('\n\n');
}

export default function MemoListScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { scale, moderateScale } = useResponsive();
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const [items, setItems] = useState<MemoRecord[]>([]);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)));

  const load = useCallback(() => {
    let active = true;

    const loadMemos = async () => {
      setIsLoading(true);

      if (isAccountDataPending) {
        return;
      }

      try {
        if (currentUser && isConfigured) {
          await ensurePersistedSlicesHydrated(db, currentUser.id, ['memos']);
          if (!active) return;
        }

        const rows = await getAllMemos(db);
        if (!active) return;
        setItems(rows);
      } catch {
        if (active) {
          setItems([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadMemos();

    return () => {
      active = false;
    };
  }, [currentUser, db, isAccountDataPending, isConfigured]);

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

  const handleCopyMemo = useCallback(
    async (memo: MemoRecord, e?: { stopPropagation?: () => void }) => {
      e?.stopPropagation?.();
      await copyToClipboard(buildMemoCopyText(memo, t));
      showToast(t('toast.copySuccess'), '😊');
    },
    [showToast, t]
  );

  if (isLoading) {
    return <LoadingScreen message="Loading memos..." />;
  }

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
          <Button onPress={handleOpenCreateDrawer} action="primary" size="sm">
            <ButtonText>{t('mypage.writeMemo')}</ButtonText>
          </Button>
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
                  <View className="flex-row items-center" style={{ gap: scale(8) }}>
                    <Pressable
                      onPress={(e) => void handleCopyMemo(item, e)}
                      hitSlop={scale(8)}
                      className="active:opacity-70"
                    >
                      <IconSymbol name="doc.on.doc" size={moderateScale(18)} color="#6b7280" />
                    </Pressable>
                    <IconSymbol name="chevron.right" size={moderateScale(16)} color="#9ca3af" />
                  </View>
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
