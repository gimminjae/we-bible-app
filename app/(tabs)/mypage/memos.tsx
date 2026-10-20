import { ScreenHeader } from "@/components/ui/screen-header";
import { AppIcon, EmptyState, FeatureIcon } from "@/components/ui/feature";
import { MemoDrawer } from '@/components/bible/memo-drawer';
import { Button, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useResponsive } from '@/hooks/use-responsive';
import { copyToClipboard } from '@/utils/clipboard';
import { useI18n } from '@/utils/i18n';
import { addMemoWithoutVerse, getAllMemos, type MemoRecord } from '@/utils/memo-db';
import { useFocusEffect } from 'expo-router';
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
      <ScreenHeader
        title={t("mypage.memosTitle")}
        onBack={() => router.back()}
        icon="create-outline"
        tone="memo"
        right={
          <Button
            onPress={handleOpenCreateDrawer}
            className="h-auto min-h-11 gap-2 rounded-2xl bg-primary-500 px-3 py-3"
          >
            <AppIcon name="add" onPrimary size={18} />
            <ButtonText className="text-white dark:text-gray-900">{t("mypage.writeMemo")}</ButtonText>
          </Button>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(24) }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <EmptyState message={t("mypage.emptyMemos")} icon="create-outline" tone="memo" />
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
                className="rounded-3xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900"
                style={{ marginBottom: scale(12), paddingHorizontal: scale(16), paddingVertical: scale(12) }}
              >
                <View className="mb-3"><FeatureIcon name="document-text-outline" tone="memo" size={36} /></View>
                <Text numberOfLines={2} className="font-semibold text-gray-900 dark:text-white" style={{ fontSize: moderateScale(16), lineHeight: moderateScale(24) }}>
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
