import { ScreenHeader } from "@/components/ui/screen-header";
import { AppIcon } from "@/components/ui/feature";
import { MemoDrawer } from '@/components/bible/memo-drawer';
import { DetailActionButton } from '@/components/ui/detail-action-button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { copyToClipboard } from '@/utils/clipboard';
import { useI18n } from '@/utils/i18n';
import { deleteMemo, getMemoById, type MemoRecord, updateMemo } from '@/utils/memo-db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
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
  const { showToast } = useToast();
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const memoId = useMemo(() => Number(params.id || 0), [params.id]);
  const [memo, setMemo] = useState<MemoRecord | null>(null);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)));

  const handleSaveEdit = useCallback(
    async (id: number, title: string, content: string) => {
      await updateMemo(db, id, title, content);
      const updated = await getMemoById(db, id);
      if (updated) setMemo(updated);
      setShowEditDrawer(false);
      showToast(t('toast.memoUpdated'), '📝');
    },
    [db, showToast, t]
  );

  const buildMemoCopyText = useCallback(
    (m: MemoRecord) => {
      const title = m.title?.trim() || t('mypage.untitled');
      const verse = m.verseText?.trim() || '';
      const content = m.content?.trim() || '';
      const lines = [
        `${title}`,
        verse ? `${verse}` : null,
        `${content}`,
      ].filter(Boolean);
      return lines.join('\n\n');
    },
    [t]
  );

  const handleCopyPress = useCallback(async () => {
    if (!memo) return;
    await copyToClipboard(buildMemoCopyText(memo));
    showToast(t('toast.copySuccess'), '😊');
  }, [memo, buildMemoCopyText, showToast, t]);

  const handleDeletePress = useCallback(() => {
    if (!memo) return;
    Alert.alert(
      t('mypage.deleteMemoConfirm'),
      '',
      [
        { text: t('mypage.deleteCancel'), style: 'cancel' },
        {
          text: t('mypage.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            await deleteMemo(db, memo.id);
            showToast(t('toast.memoDeleted'), '📝');
            router.back();
          },
        },
      ]
    );
  }, [db, memo, router, showToast, t]);

  useEffect(() => {
    let active = true;
    if (!memoId) {
      setMemo(null);
      setIsLoading(false);
      return;
    }

    const loadMemo = async () => {
      setIsLoading(true);

      if (isAccountDataPending) {
        return;
      }

      try {
        const row = await getMemoById(db, memoId);
        if (!active) return;
        setMemo(row);
      } catch {
        if (active) {
          setMemo(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadMemo();

    return () => {
      active = false;
    };
  }, [currentUser, db, isAccountDataPending, isConfigured, memoId]);

  if (isLoading) {
    return <LoadingScreen message="Loading memo..." />;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader
        title={t("mypage.memoDetailTitle")}
        onBack={() => router.back()}
        icon="document-text-outline"
        tone="memo"
        right={memo
          ? (
            <View className="shrink-0 flex-row items-center gap-2">
              <Pressable
                onPress={handleCopyPress}
                accessibilityRole="button"
                accessibilityLabel={t("common.copy")}
                className="h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
              >
                <AppIcon name="copy-outline" tone="memo" />
              </Pressable>
              <DetailActionButton
                action="edit"
                label={t("mypage.editMemo")}
                onPress={() => setShowEditDrawer(true)}
              />
              <DetailActionButton
                action="delete"
                label={t("mypage.deleteMemo")}
                onPress={handleDeletePress}
              />
            </View>
          )
          : null}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {!memo ? (
          <Text className="text-gray-500 dark:text-gray-400 mt-6">{t('mypage.memoNotFound')}</Text>
        ) : (
          <>
            <View className="mb-3 px-4 py-3 rounded-3xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {memo.title?.trim() ? memo.title : t('mypage.untitled')}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {formatDate(memo.createdAt)}
              </Text>
            </View>

            {memo.verseText?.trim() ? (
              <View className="mb-3 px-4 py-3 rounded-3xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900">
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('mypage.verseText')}</Text>
                <Text className="text-base leading-6 text-gray-900 dark:text-white">{memo.verseText}</Text>
              </View>
            ) : null}

            <View className="px-4 py-3 rounded-3xl bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900">
              <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('mypage.content')}</Text>
              <Text className="text-base leading-6 text-gray-900 dark:text-white">
                {memo.content || t('mypage.noContent')}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {memo ? (
        <MemoDrawer
          isOpen={showEditDrawer}
          onClose={() => setShowEditDrawer(false)}
          initialVerseText={memo.verseText}
          onSave={() => { }}
          editMemo={{
            id: memo.id,
            title: memo.title,
            content: memo.content,
            verseText: memo.verseText,
          }}
          onSaveEdit={handleSaveEdit}
        />
      ) : null}
    </SafeAreaView>
  );
}
