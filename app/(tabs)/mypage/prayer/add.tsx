import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useLoading } from '@/hooks/use-loading';
import { ensurePersistedSlicesHydrated } from '@/lib/sqlite-supabase-store';
import { useI18n } from '@/utils/i18n';
import { addPrayer } from '@/utils/prayer-db';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

export default function AddPrayerScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const [requester, setRequester] = useState('');
  const [relation, setRelation] = useState('');
  const [target, setTarget] = useState('');
  const [content, setContent] = useState('');
  const [isMyPrayer, setIsMyPrayer] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { isLoading, runWithLoading } = useLoading();

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)));

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      setIsInitializing(true);

      if (isAccountDataPending) {
        return;
      }

      try {
        if (currentUser && isConfigured) {
          await ensurePersistedSlicesHydrated(db, currentUser.id, ['prayers']);
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    };

    void initialize().catch(() => {
      if (active) {
        setIsInitializing(false);
      }
    });

    return () => {
      active = false;
    };
  }, [currentUser, db, isAccountDataPending, isConfigured]);

  const handleToggleMyPrayer = useCallback(() => {
    setIsMyPrayer((prev) => {
      const next = !prev;
      if (next) {
        setRequester('');
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    await runWithLoading(async () => {
      const id = await addPrayer(db, requester, relation, target, content, { isMyPrayer });
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
  }, [content, db, isMyPrayer, relation, requester, router, runWithLoading, showToast, t, target]);

  if (isInitializing) {
    return <LoadingScreen message="Loading prayer..." />;
  }

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
          <Pressable
            onPress={handleToggleMyPrayer}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isMyPrayer }}
            className="mb-4 flex-row items-start rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900"
            style={{ gap: 12 }}
          >
            <IconSymbol
              name={isMyPrayer ? 'checkmark.square.fill' : 'square'}
              size={20}
              color={isMyPrayer ? '#0ea5e9' : '#9ca3af'}
            />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('mypage.myPrayerToggleLabel')}
              </Text>
              {/* <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('mypage.myPrayerToggleDescription')}
              </Text> */}
            </View>
          </Pressable>

          {!isMyPrayer ? (
            <>
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
            </>
          ) : null}

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
