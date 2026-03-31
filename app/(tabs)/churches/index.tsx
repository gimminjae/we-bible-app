import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ChurchRoleBadge } from '@/components/churches/role-badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useChurchActions, useChurchSearch, useMyChurches } from '@/hooks/use-churches';
import { useI18n } from '@/utils/i18n';

export default function ChurchesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { currentUser, isConfigured } = useAuth();
  const { churches: myChurches, isLoading, error } = useMyChurches();
  const { createChurch, requestJoin } = useChurchActions();
  const [newChurchName, setNewChurchName] = useState('');
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

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={t('church.title')} />

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

        {canUseChurchFeature ? (
          <View className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('church.createTitle')}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('church.createDescription')}
            </Text>

            <View className="mt-4 flex-row gap-3">
              <TextInput
                value={newChurchName}
                onChangeText={setNewChurchName}
                placeholder={t('church.createPlaceholder')}
                placeholderTextColor="#9ca3af"
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
              <Pressable
                disabled={isSubmittingCreate || !newChurchName.trim()}
                onPress={async () => {
                  setIsSubmittingCreate(true);
                  try {
                    const churchId = await createChurch(newChurchName);
                    showToast(t('toast.churchCreated'));
                    setNewChurchName('');
                    router.push(`/churches/${churchId}` as never);
                  } catch (createError) {
                    showToast(
                      createError instanceof Error ? createError.message : t('church.createFailed'),
                    );
                  } finally {
                    setIsSubmittingCreate(false);
                  }
                }}
                className={`items-center justify-center rounded-2xl px-5 ${
                  isSubmittingCreate || !newChurchName.trim()
                    ? 'bg-gray-300 dark:bg-gray-700'
                    : 'bg-primary-500'
                }`}
              >
                <Text className="font-semibold text-white">{t('church.createButton')}</Text>
              </Pressable>
            </View>
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
                onPress={() =>
                  router.push(`/churches/${church.id}` as never)
                }
                className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {church.name}
                    </Text>
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

        <View className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('church.searchTitle')}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('church.searchDescription')}
          </Text>

          <TextInput
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder={t('church.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          />

          {searchError ? (
            <Text className="mt-3 text-sm text-red-500">{searchError.message}</Text>
          ) : null}

          {!searchKeyword.trim() ? (
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('church.searchHint')}
            </Text>
          ) : isSearching ? (
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('church.searching')}
            </Text>
          ) : searchResults.length === 0 ? (
            <View className="mt-4 rounded-3xl border border-dashed border-gray-200 px-5 py-8 dark:border-gray-800">
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('church.noSearchResults')}
              </Text>
            </View>
          ) : (
            searchResults.map((church) => (
              <View
                key={church.id}
                className="mt-3 rounded-3xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-white">{church.name}</Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t('church.memberCount').replace('{count}', String(church.memberCount))}
                    </Text>
                  </View>

                  {church.isMember ? (
                    <Pressable
                      onPress={() =>
                        router.push(`/churches/${church.id}` as never)
                      }
                      className="rounded-2xl bg-primary-500 px-4 py-3"
                    >
                      <Text className="font-semibold text-white">{t('church.enter')}</Text>
                    </Pressable>
                  ) : church.pendingRequestStatus === 'pending' ? (
                    <View className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                      <Text className="font-semibold text-gray-500 dark:text-gray-400">
                        {t('church.requestPending')}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      disabled={submittingJoinChurchId === church.id || !canUseChurchFeature}
                      onPress={async () => {
                        setSubmittingJoinChurchId(church.id);
                        try {
                          await requestJoin(church.id);
                          showToast(t('toast.joinRequestSent'));
                        } catch (joinError) {
                          showToast(
                            joinError instanceof Error
                              ? joinError.message
                              : t('church.joinRequestFailed'),
                          );
                        } finally {
                          setSubmittingJoinChurchId(null);
                        }
                      }}
                      className={`rounded-2xl px-4 py-3 ${
                        submittingJoinChurchId === church.id || !canUseChurchFeature
                          ? 'bg-gray-300 dark:bg-gray-700'
                          : 'bg-primary-500'
                      }`}
                    >
                      <Text className="font-semibold text-white">{t('church.requestJoin')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
