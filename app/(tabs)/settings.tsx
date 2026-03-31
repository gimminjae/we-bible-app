import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/ads/ad-banner';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GoogleIcon } from '@/components/ui/icons/GoogleIcon';
import { KakaoIcon } from '@/components/ui/icons/KakaoIcon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SelectionSheet } from '@/components/ui/selection-sheet';
import { useAppSettings } from '@/contexts/app-settings';
import { useAuth } from '@/contexts/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchUserProfile, updateMyDisplayName } from '@/lib/church';
import { getUserAccountLabel, getUserDisplayName, getUserProvider, type SocialProvider } from '@/lib/supabase';
import { useI18n } from '@/utils/i18n';
import { useToast } from '@/contexts/toast-context';

const LANGUAGE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
] as const;

function isValidDisplayName(displayName: string) {
  return /^[A-Za-z0-9가-힣._-]{2,20}$/.test(displayName.trim());
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/.test(password);
}

export default function SettingsScreen() {
  const { theme, setTheme, appLanguage, setAppLanguage } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { scale, moderateScale } = useResponsive();
  const {
    currentUser,
    isConfigured,
    isLoadingSession,
    isSyncingData,
    lastError,
    signIn,
    signOut,
    signUp,
    signInWithOAuth,
    clearLastError,
  } = useAuth();

  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [displayNameSheetVisible, setDisplayNameSheetVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isLoadingDisplayName, setIsLoadingDisplayName] = useState(false);
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);

  useEffect(() => {
    if (!lastError) return;
    showToast(lastError);
    clearLastError();
  }, [clearLastError, lastError, showToast]);

  useEffect(() => {
    let cancelled = false;

    const loadDisplayName = async () => {
      if (!isConfigured || !currentUser) {
        const fallbackDisplayName = getUserDisplayName(currentUser) ?? '';
        if (!cancelled) {
          setDisplayName(fallbackDisplayName);
          setDisplayNameInput(fallbackDisplayName);
          setIsLoadingDisplayName(false);
        }
        return;
      }

      setIsLoadingDisplayName(true);

      try {
        const profile = await fetchUserProfile(currentUser.id);
        if (cancelled) return;
        const nextDisplayName = profile?.displayName ?? getUserDisplayName(currentUser) ?? '';
        setDisplayName(nextDisplayName);
        setDisplayNameInput(nextDisplayName);
      } catch {
        if (cancelled) return;
        const fallbackDisplayName = getUserDisplayName(currentUser) ?? '';
        setDisplayName(fallbackDisplayName);
        setDisplayNameInput(fallbackDisplayName);
      } finally {
        if (!cancelled) {
          setIsLoadingDisplayName(false);
        }
      }
    };

    void loadDisplayName();

    return () => {
      cancelled = true;
    };
  }, [currentUser, isConfigured]);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [setTheme, theme]);

  const handleEmailAuth = useCallback(async () => {
    if (!isConfigured) return;

    if (!email.trim()) {
      showToast(t('settings.requiredEmail'));
      return;
    }

    if (!isValidEmail(email.trim())) {
      showToast(t('settings.invalidEmail'));
      return;
    }

    if (!password) {
      showToast(t('settings.requiredPassword'));
      return;
    }

    if (!isValidPassword(password)) {
      showToast(t('settings.invalidPasswordRule'));
      return;
    }

    if (isSignUpMode) {
      if (!confirmPassword) {
        showToast(t('settings.requiredConfirmPassword'));
        return;
      }

      if (password !== confirmPassword) {
        showToast(t('settings.passwordMismatch'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isSignUpMode) {
        const result = await signUp(email.trim(), password);
        if (result.requiresEmailVerification) {
          showToast(t('settings.emailVerifyHint'));
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch {
      showToast(isSignUpMode ? t('settings.signUpFailed') : t('settings.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confirmPassword,
    email,
    isConfigured,
    isSignUpMode,
    password,
    showToast,
    signIn,
    signUp,
    t,
  ]);

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider) => {
      if (!isConfigured) return;
      setIsSubmitting(true);
      try {
        await signInWithOAuth(provider);
      } catch {
        showToast(provider === 'google' ? t('settings.googleLoginFailed') : t('settings.kakaoLoginFailed'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isConfigured, showToast, signInWithOAuth, t],
  );

  const handleLogout = useCallback(() => {
    if (!isConfigured) return;

    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMessage'), [
      { text: t('settings.logoutCancel'), style: 'cancel' },
      {
        text: t('settings.logoutConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setIsSubmitting(true);
            try {
              await signOut();
            } catch {
              showToast(t('settings.logoutFailed'));
            } finally {
              setIsSubmitting(false);
            }
          })();
        },
      },
    ]);
  }, [isConfigured, showToast, signOut, t]);

  const handleDisplayNameSave = useCallback(async () => {
    if (!currentUser) return;

    const trimmedDisplayName = displayNameInput.trim();
    if (!trimmedDisplayName) {
      showToast(t('settings.displayNameRequired'));
      return;
    }

    if (!isValidDisplayName(trimmedDisplayName)) {
      showToast(t('settings.displayNameInvalidRule'));
      return;
    }

    setIsUpdatingDisplayName(true);
    try {
      const nextDisplayName = await updateMyDisplayName(currentUser.id, trimmedDisplayName);
      setDisplayName(nextDisplayName);
      setDisplayNameInput(nextDisplayName);
      setDisplayNameSheetVisible(false);
      showToast(t('settings.displayNameUpdated'));
    } catch {
      showToast(t('settings.displayNameUpdateFailed'));
    } finally {
      setIsUpdatingDisplayName(false);
    }
  }, [currentUser, displayNameInput, showToast, t]);

  const currentLanguageLabel = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.value === appLanguage)?.label ?? '한국어',
    [appLanguage],
  );

  const userLabel =
    getUserAccountLabel(currentUser) ??
    (getUserProvider(currentUser) === 'google'
      ? t('settings.googleAccountConnected')
      : getUserProvider(currentUser) === 'kakao'
        ? t('settings.kakaoAccountConnected')
        : currentUser
          ? t('settings.socialAccountConnected')
          : null);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenHeader title={t('settings.title')} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(20),
          paddingBottom: scale(40),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('settings.systemLanguage')}
          </Text>
          <Pressable
            onPress={() => setLanguageSheetVisible(true)}
            className="mt-2 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-950"
          >
            <Text className="text-base text-gray-900 dark:text-white">{currentLanguageLabel}</Text>
            <IconSymbol
              name="chevron.down"
              size={moderateScale(18)}
              color={theme === 'light' ? '#374151' : '#9ca3af'}
            />
          </Pressable>

          <Text className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('settings.theme')}
          </Text>
          <Pressable
            onPress={handleToggleTheme}
            className="mt-2 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-950"
          >
            <Text className="text-base text-gray-900 dark:text-white">
              {theme === 'light' ? t('settings.lightMode') : t('settings.darkMode')}
            </Text>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <IconSymbol
                name={theme === 'light' ? 'moon.fill' : 'sun.max.fill'}
                size={moderateScale(22)}
                color={theme === 'light' ? '#374151' : '#f59e0b'}
              />
            </View>
          </Pressable>
        </View>

        <View className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <View className="mb-4 flex-row items-center" style={{ gap: scale(6) }}>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('settings.account')}
            </Text>
          </View>

          {!isConfigured ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.authNotConfigured')}
            </Text>
          ) : isLoadingSession || isSyncingData ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t('settings.authChecking')}</Text>
          ) : currentUser ? (
            <>
              <Text className="text-sm text-gray-500 dark:text-gray-400">{userLabel}</Text>

              <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.displayNameLabel')}
                </Text>
                <View className="mt-2 flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-base text-gray-900 dark:text-white">
                    {isLoadingDisplayName
                      ? t('settings.authChecking')
                      : displayName || t('settings.displayNameEmpty')}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setDisplayNameInput(displayName);
                      setDisplayNameSheetVisible(true);
                    }}
                    disabled={isLoadingDisplayName}
                    className="rounded-2xl bg-primary-500 px-4 py-3"
                  >
                    <Text className="font-semibold text-white">{t('settings.changeDisplayName')}</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleLogout}
                disabled={isSubmitting}
                className="mt-4 items-center justify-center rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800"
              >
                <Text className="font-semibold text-gray-900 dark:text-white">{t('settings.logout')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {t('settings.accountGuestSyncHint')}
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t('settings.email')}
                placeholderTextColor="#9ca3af"
                className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t('settings.password')}
                placeholderTextColor="#9ca3af"
                className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />

              {isSignUpMode ? (
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder={t('settings.confirmPassword')}
                  placeholderTextColor="#9ca3af"
                  className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              ) : null}

              <Pressable
                onPress={() => void handleEmailAuth()}
                disabled={isSubmitting}
                className={`items-center justify-center rounded-2xl px-4 py-4 ${
                  isSubmitting ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
                }`}
              >
                <Text className="font-semibold text-white">
                  {isSignUpMode ? t('settings.signUp') : t('settings.signIn')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsSignUpMode((previous) => !previous)}
                disabled={isSubmitting}
                className="mt-3 items-center justify-center rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800"
              >
                <Text className="font-semibold text-gray-900 dark:text-white">
                  {isSignUpMode ? t('settings.switchToSignIn') : t('settings.switchToSignUp')}
                </Text>
              </Pressable>

              <View className="mt-3 flex-row gap-3">
                <Pressable
                  onPress={() => void handleSocialLogin('google')}
                  disabled={isSubmitting}
                  className="flex-1 flex-row items-center justify-center rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800"
                  style={{ gap: scale(8) }}
                >
                  <GoogleIcon />
                  <Text className="font-semibold text-gray-900 dark:text-white">
                    {t('settings.googleLogin')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSocialLogin('kakao')}
                  disabled={isSubmitting}
                  className="flex-1 flex-row items-center justify-center rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800"
                  style={{ gap: scale(8) }}
                >
                  <KakaoIcon />
                  <Text className="font-semibold text-gray-900 dark:text-white">
                    {t('settings.kakaoLogin')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

        </View>

        <AdBanner />
      </ScrollView>

      <SelectionSheet
        visible={languageSheetVisible}
        title={t('settings.languageSelect')}
        value={appLanguage}
        options={LANGUAGE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        onClose={() => setLanguageSheetVisible(false)}
        onSelect={(value) => setAppLanguage(value as 'ko' | 'en')}
      />

      <BottomSheet
        visible={displayNameSheetVisible}
        onClose={() => {
          if (isUpdatingDisplayName) return;
          setDisplayNameSheetVisible(false);
        }}
        heightFraction={0.55}
      >
        <View className="flex-1">
          <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.displayNameTitle')}
            </Text>
          </View>
          <View className="px-6 py-6">
            <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('settings.displayNameLabel')}
            </Text>
            <TextInput
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              placeholder={t('settings.displayNamePlaceholder')}
              placeholderTextColor="#9ca3af"
              maxLength={20}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('settings.displayNameInvalidRule')}
            </Text>
            <Pressable
              onPress={() => void handleDisplayNameSave()}
              disabled={isUpdatingDisplayName}
              className={`mt-5 items-center justify-center rounded-2xl px-4 py-4 ${
                isUpdatingDisplayName ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
              }`}
            >
              <Text className="font-semibold text-white">{t('settings.displayNameSave')}</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
