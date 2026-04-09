import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AdBanner } from '@/components/ads/ad-banner';
import { ChurchInfoSheet } from '@/components/churches/church-info-sheet';
import { ChurchRoleBadge } from '@/components/churches/role-badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useChurchActions, useChurchSearch, useMyChurches } from '@/hooks/use-churches';
import type { ChurchSearchResult } from '@/lib/church';
import { useI18n } from '@/utils/i18n';

type HeaderActionButtonProps = {
  label: string;
  onPress: () => void;
};

function HeaderActionButton({ label, onPress }: HeaderActionButtonProps) {
  return (
    <Button
      action="secondary"
      variant="outline"
      onPress={onPress}
      className="h-auto rounded-full border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
    >
      <ButtonText className="text-sm font-semibold text-gray-900 dark:text-white">{label}</ButtonText>
    </Button>
  );
}

type DrawerHeaderProps = {
  title: string;
  onClose: () => void;
};

function DrawerHeader({ title, onClose }: DrawerHeaderProps) {
  const { t } = useI18n();

  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 px-5 pb-3 pt-4 dark:border-gray-800">
      <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-white">{title}</Text>
      <Button action="secondary" variant="link" onPress={onClose} className="h-auto rounded-2xl px-3 py-2">
        <ButtonText className="font-semibold text-gray-500 dark:text-gray-400">{t('common.cancel')}</ButtonText>
      </Button>
    </View>
  );
}

type SearchChurchDrawerProps = {
  visible: boolean;
  keyword: string;
  isSearching: boolean;
  errorMessage: string | null;
  results: ChurchSearchResult[];
  submittingJoinChurchId: string | null;
  canUseChurchFeature: boolean;
  onChangeKeyword: (value: string) => void;
  onClose: () => void;
  onEnter: (churchId: string) => void;
  onRequestJoin: (churchId: string) => void;
};

function SearchChurchDrawer({
  visible,
  keyword,
  isSearching,
  errorMessage,
  results,
  submittingJoinChurchId,
  canUseChurchFeature,
  onChangeKeyword,
  onClose,
  onEnter,
  onRequestJoin,
}: SearchChurchDrawerProps) {
  const { t } = useI18n();

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.82}>
      <DrawerHeader title={t('church.searchTitle')} onClose={onClose} />
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 }}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('church.searchDescription')}
          </Text>

          <TextInput
            value={keyword}
            onChangeText={onChangeKeyword}
            placeholder={t('church.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            autoFocus={visible}
            className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          />

          {errorMessage ? <Text className="mt-3 text-sm text-red-500">{errorMessage}</Text> : null}

          {!keyword.trim() ? (
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('church.searchHint')}
            </Text>
          ) : isSearching ? (
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('church.searching')}
            </Text>
          ) : results.length === 0 ? (
            <View className="mt-4 rounded-3xl border border-dashed border-gray-200 px-5 py-8 dark:border-gray-800">
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('church.noSearchResults')}
              </Text>
            </View>
          ) : (
            results.map((church) => (
              <View
                key={church.id}
                className="mt-3 rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-white">{church.name}</Text>
                    {church.description ? (
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
                        {church.description}
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t('church.memberCount').replace('{count}', String(church.memberCount))}
                    </Text>
                  </View>

                  {church.isMember ? (
                    <Button
                      onPress={() => onEnter(church.id)}
                      className="h-auto rounded-2xl bg-primary-500 px-4 py-3"
                    >
                      <ButtonText className="font-semibold text-white">{t('church.enter')}</ButtonText>
                    </Button>
                  ) : church.pendingRequestStatus === 'pending' ? (
                    <View className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                      <Text className="font-semibold text-gray-500 dark:text-gray-400">
                        {t('church.requestPending')}
                      </Text>
                    </View>
                  ) : (
                    <Button
                      disabled={submittingJoinChurchId === church.id || !canUseChurchFeature}
                      onPress={() => onRequestJoin(church.id)}
                      className={`h-auto rounded-2xl px-4 py-3 ${
                        submittingJoinChurchId === church.id || !canUseChurchFeature
                          ? 'bg-gray-300 dark:bg-gray-700'
                          : 'bg-primary-500'
                      }`}
                    >
                      <ButtonText className="font-semibold text-white">{t('church.requestJoin')}</ButtonText>
                    </Button>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

export default function ChurchesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { currentUser, isConfigured } = useAuth();
  const { churches: myChurches, isLoading, error } = useMyChurches();
  const { createChurch, requestJoin } = useChurchActions();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [submittingJoinChurchId, setSubmittingJoinChurchId] = useState<string | null>(null);
  const {
    churches: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useChurchSearch(searchKeyword);

  if (error) {
    return <LoadingScreen message={error.message} />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading churches..." />;
  }

  const canUseChurchFeature = Boolean(isConfigured && currentUser);

  const openCreateDrawer = () => {
    setIsSearchDrawerOpen(false);
    setSearchKeyword('');
    setSubmittingJoinChurchId(null);
    setIsCreateDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const openSearchDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsSearchDrawerOpen(true);
  };

  const closeSearchDrawer = () => {
    setIsSearchDrawerOpen(false);
    setSearchKeyword('');
    setSubmittingJoinChurchId(null);
  };

  const handleCreateChurchSubmit = async (input: { name: string; description: string }) => {
    setIsSubmittingCreate(true);
    try {
      const churchId = await createChurch(input);
      showToast(t('toast.churchCreated'));
      setIsCreateDrawerOpen(false);
      router.push(`/churches/${churchId}` as never);
    } catch (createError) {
      showToast(createError instanceof Error ? createError.message : t('church.createFailed'));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleEnterChurch = (churchId: string) => {
    closeSearchDrawer();
    router.push(`/churches/${churchId}` as never);
  };

  const handleRequestJoin = async (churchId: string) => {
    setSubmittingJoinChurchId(churchId);
    try {
      await requestJoin(churchId);
      showToast(t('toast.joinRequestSent'));
    } catch (joinError) {
      showToast(joinError instanceof Error ? joinError.message : t('church.joinRequestFailed'));
    } finally {
      setSubmittingJoinChurchId(null);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader
        title={t('church.title')}
        right={
          canUseChurchFeature ? (
            <>
              <HeaderActionButton label={t('church.searchButton')} onPress={openSearchDrawer} />
              <HeaderActionButton label={t('church.createButton')} onPress={openCreateDrawer} />
            </>
          ) : null
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {!isConfigured ? (
          <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('church.authNotConfigured')}
            </Text>
          </View>
        ) : null}

        {isConfigured && !currentUser ? (
          <View className="mb-4 rounded-3xl border border-dashed border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('church.loginRequired')}
            </Text>
          </View>
        ) : null}

        <View className="mb-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t('church.myChurches')}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">{myChurches.length}</Text>
          </View>

          {myChurches.length === 0 ? (
            <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('church.emptyMyChurches')}
              </Text>
            </View>
          ) : (
            myChurches.map((church) => (
              <Pressable
                key={church.id}
                onPress={() => router.push(`/churches/${church.id}` as never)}
                className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {church.name}
                    </Text>
                    {church.description ? (
                      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
                        {church.description}
                      </Text>
                    ) : null}
                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {t('church.memberCount').replace('{count}', String(church.memberCount))}
                    </Text>
                    {church.myTeamName ? (
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('church.teamLabel')} {church.myTeamName}
                      </Text>
                    ) : null}
                  </View>
                  {church.myRole ? <ChurchRoleBadge role={church.myRole} /> : null}
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View className="mt-2">
          <AdBanner />
        </View>
      </ScrollView>

      <ChurchInfoSheet
        visible={isCreateDrawerOpen}
        mode="create"
        isSubmitting={isSubmittingCreate}
        onClose={closeCreateDrawer}
        onSubmit={handleCreateChurchSubmit}
      />

      <SearchChurchDrawer
        visible={isSearchDrawerOpen}
        keyword={searchKeyword}
        isSearching={isSearching}
        errorMessage={searchError?.message ?? null}
        results={searchResults}
        submittingJoinChurchId={submittingJoinChurchId}
        canUseChurchFeature={canUseChurchFeature}
        onChangeKeyword={setSearchKeyword}
        onClose={closeSearchDrawer}
        onEnter={handleEnterChurch}
        onRequestJoin={handleRequestJoin}
      />
    </SafeAreaView>
  );
}
