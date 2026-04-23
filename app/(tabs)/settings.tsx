import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { AdBanner } from '@/components/ads/ad-banner';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppleIcon } from '@/components/ui/icons/AppleIcon';
import { GoogleIcon } from '@/components/ui/icons/GoogleIcon';
import { KakaoIcon } from '@/components/ui/icons/KakaoIcon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SelectionSheet } from '@/components/ui/selection-sheet';
import { useAppSettings } from '@/contexts/app-settings';
import { useAuth } from '@/contexts/auth-context';
import { useMyChurches } from '@/hooks/use-churches';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchUserProfile, updateMyDisplayName, updateMyEmailVisibility } from '@/lib/church';
import { createDeveloperInquiry } from '@/lib/developer-inquiries';
import { padNumber } from '@/lib/date';
import { requestLocalNotificationPermissions } from '@/lib/theme-verse-notifications';
import {
  getUserAccountLabel,
  getUserDisplayName,
  getUserProvider,
  isAppleOAuthConfigured,
  type SocialProvider,
} from '@/lib/supabase';
import {
  THEME_VERSE_NOTIFICATION_WEEKDAYS,
  type ThemeVerseNotificationWeekday,
} from '@/utils/bible-storage';
import { useI18n } from '@/utils/i18n';
import { useToast } from '@/contexts/toast-context';
import { getCurrentThemeVerseYear, getThemeVerseByYear } from '@/utils/theme-verse-db';

const LANGUAGE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
] as const;

const THEME_VERSE_NOTIFICATION_WEEKDAY_LABELS = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const;

function isValidDisplayName(displayName: string) {
  return /^[A-Za-z0-9가-힣._-]{2,20}$/.test(displayName.trim());
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/.test(password);
}

function getDeleteAccountErrorMessage(error: unknown, translate: (key: string) => string) {
  if (error instanceof Error) {
    if (error.message === 'ACCOUNT_DELETE_HAS_SUPER_ADMIN_CHURCH') {
      return translate('settings.deleteAccountBlockedBySuperAdminChurch');
    }

    return error.message;
  }

  return translate('settings.deleteAccountFailed');
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const {
    bibleMeditationNotificationEnabled,
    setBibleMeditationNotificationEnabled,
    theme,
    setTheme,
    appLanguage,
    setAppLanguage,
    isReady,
    themeVerseNotificationSettings,
    setThemeVerseNotificationSettings,
  } = useAppSettings();
  const { t } = useI18n();
  const { showToast } = useToast();
  const { scale, moderateScale, narrowPageMaxWidth } = useResponsive();
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
    deleteAccount,
    clearLastError,
  } = useAuth();
  const { churches: myChurches } = useMyChurches();

  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [displayNameSheetVisible, setDisplayNameSheetVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [showEmailInProfile, setShowEmailInProfile] = useState(false);
  const [isLoadingDisplayName, setIsLoadingDisplayName] = useState(false);
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  const [isUpdatingEmailVisibility, setIsUpdatingEmailVisibility] = useState(false);
  const [developerInquirySheetVisible, setDeveloperInquirySheetVisible] = useState(false);
  const [developerInquiryAuthorName, setDeveloperInquiryAuthorName] = useState('');
  const [developerInquiryTitle, setDeveloperInquiryTitle] = useState('');
  const [developerInquiryContent, setDeveloperInquiryContent] = useState('');
  const [isSubmittingDeveloperInquiry, setIsSubmittingDeveloperInquiry] = useState(false);
  const [notificationTimeSheetVisible, setNotificationTimeSheetVisible] = useState(false);
  const [notificationHourInput, setNotificationHourInput] = useState('');
  const [notificationMinuteInput, setNotificationMinuteInput] = useState('');

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
          setShowEmailInProfile(false);
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
        setShowEmailInProfile(profile?.showEmail ?? false);
      } catch {
        if (cancelled) return;
        const fallbackDisplayName = getUserDisplayName(currentUser) ?? '';
        setDisplayName(fallbackDisplayName);
        setDisplayNameInput(fallbackDisplayName);
        setShowEmailInProfile(false);
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
        showToast(
          provider === 'google'
            ? t('settings.googleLoginFailed')
            : provider === 'kakao'
              ? t('settings.kakaoLoginFailed')
              : t('settings.appleLoginFailed'),
        );
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

  const handleEmailVisibilityToggle = useCallback(async () => {
    if (!currentUser?.email) return;

    const nextShowEmail = !showEmailInProfile;
    setIsUpdatingEmailVisibility(true);
    try {
      await updateMyEmailVisibility(currentUser, nextShowEmail);
      setShowEmailInProfile(nextShowEmail);
      showToast(t('settings.emailVisibilityUpdated'));
    } catch {
      showToast(t('settings.emailVisibilityUpdateFailed'));
    } finally {
      setIsUpdatingEmailVisibility(false);
    }
  }, [currentUser, showEmailInProfile, showToast, t]);

  const resetDeveloperInquiryForm = useCallback(() => {
    setDeveloperInquiryAuthorName((displayName || getUserDisplayName(currentUser)) ?? '');
    setDeveloperInquiryTitle('');
    setDeveloperInquiryContent('');
  }, [currentUser, displayName]);

  const handleOpenDeveloperInquirySheet = useCallback(() => {
    if (!isConfigured) {
      showToast(t('settings.developerInquiryUnavailable'));
      return;
    }

    resetDeveloperInquiryForm();
    setDeveloperInquirySheetVisible(true);
  }, [isConfigured, resetDeveloperInquiryForm, showToast, t]);

  const handleSubmitDeveloperInquiry = useCallback(async () => {
    if (!isConfigured) {
      showToast(t('settings.developerInquiryUnavailable'));
      return;
    }

    const trimmedAuthorName = developerInquiryAuthorName.trim();
    const trimmedTitle = developerInquiryTitle.trim();
    const trimmedContent = developerInquiryContent.trim();

    if (!trimmedAuthorName) {
      showToast(t('settings.developerInquiryRequiredAuthorName'));
      return;
    }

    if (!trimmedTitle) {
      showToast(t('settings.developerInquiryRequiredTitle'));
      return;
    }

    if (!trimmedContent) {
      showToast(t('settings.developerInquiryRequiredContent'));
      return;
    }

    setIsSubmittingDeveloperInquiry(true);
    try {
      await createDeveloperInquiry({
        authorUserId: currentUser?.id ?? null,
        authorName: trimmedAuthorName,
        title: trimmedTitle,
        content: trimmedContent,
      });
      setDeveloperInquirySheetVisible(false);
      resetDeveloperInquiryForm();
      showToast(t('settings.developerInquirySubmitSuccess'));
    } catch {
      showToast(t('settings.developerInquirySubmitFailed'));
    } finally {
      setIsSubmittingDeveloperInquiry(false);
    }
  }, [
    currentUser,
    developerInquiryAuthorName,
    developerInquiryContent,
    developerInquiryTitle,
    isConfigured,
    resetDeveloperInquiryForm,
    showToast,
    t,
  ]);

  const currentLanguageLabel = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.value === appLanguage)?.label ?? '한국어',
    [appLanguage],
  );
  const themeVerseNotificationWeekdayLabels = useMemo(
    () => THEME_VERSE_NOTIFICATION_WEEKDAY_LABELS[appLanguage],
    [appLanguage],
  );
  const formattedThemeVerseNotificationTime = useMemo(
    () =>
      `${padNumber(themeVerseNotificationSettings.hour)}:${padNumber(themeVerseNotificationSettings.minute)}`,
    [themeVerseNotificationSettings.hour, themeVerseNotificationSettings.minute],
  );
  const superAdminChurches = useMemo(
    () => myChurches.filter((church) => church.myRole === 'super_admin'),
    [myChurches],
  );
  const shouldShowAppleLogin = Platform.OS === 'ios' || isAppleOAuthConfigured();
  const socialLoginIconColor = theme === 'light' ? '#111827' : '#ffffff';

  const userLabel =
    getUserAccountLabel(currentUser) ??
    (getUserProvider(currentUser) === 'google'
      ? t('settings.googleAccountConnected')
      : getUserProvider(currentUser) === 'kakao'
        ? t('settings.kakaoAccountConnected')
        : getUserProvider(currentUser) === 'apple'
          ? t('settings.appleAccountConnected')
        : currentUser
          ? t('settings.socialAccountConnected')
          : null);

  const handleThemeVerseNotificationToggle = useCallback(
    async (nextEnabled: boolean) => {
      if (Platform.OS === 'web') return;

      if (nextEnabled) {
        const granted = await requestLocalNotificationPermissions();
        if (!granted) {
          showToast(t('settings.themeVerseNotificationPermissionDenied'));
          return;
        }
      }

      try {
        await setThemeVerseNotificationSettings({
          ...themeVerseNotificationSettings,
          enabled: nextEnabled,
        });

        if (nextEnabled) {
          const currentThemeVerse = await getThemeVerseByYear(db, getCurrentThemeVerseYear());
          if (!currentThemeVerse) {
            showToast(t('settings.themeVerseNotificationWaitingForVerse'));
          }
        }
      } catch {
        showToast(t('settings.themeVerseNotificationUpdateFailed'));
      }
    },
    [db, setThemeVerseNotificationSettings, showToast, t, themeVerseNotificationSettings],
  );

  const handleBibleMeditationNotificationToggle = useCallback(
    async (nextEnabled: boolean) => {
      if (Platform.OS === 'web') return;

      if (nextEnabled) {
        const granted = await requestLocalNotificationPermissions();
        if (!granted) {
          showToast(t('settings.themeVerseNotificationPermissionDenied'));
          return;
        }
      }

      try {
        await setBibleMeditationNotificationEnabled(nextEnabled);
      } catch {
        showToast(t('settings.bibleMeditationNotificationUpdateFailed'));
      }
    },
    [setBibleMeditationNotificationEnabled, showToast, t],
  );

  const handleThemeVerseNotificationWeekdayToggle = useCallback(
    async (weekday: ThemeVerseNotificationWeekday) => {
      const exists = themeVerseNotificationSettings.weekdays.includes(weekday);
      const nextWeekdays = exists
        ? themeVerseNotificationSettings.weekdays.filter((value) => value !== weekday)
        : [...themeVerseNotificationSettings.weekdays, weekday].sort((left, right) => left - right);

      if (nextWeekdays.length === 0) {
        showToast(t('settings.themeVerseNotificationWeekdayRequired'));
        return;
      }

      try {
        await setThemeVerseNotificationSettings({
          ...themeVerseNotificationSettings,
          weekdays: nextWeekdays as ThemeVerseNotificationWeekday[],
        });
      } catch {
        showToast(t('settings.themeVerseNotificationUpdateFailed'));
      }
    },
    [setThemeVerseNotificationSettings, showToast, t, themeVerseNotificationSettings],
  );

  const handleOpenNotificationTimeSheet = useCallback(() => {
    setNotificationHourInput(String(themeVerseNotificationSettings.hour));
    setNotificationMinuteInput(String(themeVerseNotificationSettings.minute));
    setNotificationTimeSheetVisible(true);
  }, [themeVerseNotificationSettings.hour, themeVerseNotificationSettings.minute]);

  const handleSaveNotificationTime = useCallback(async () => {
    const hour = Number(notificationHourInput.trim());
    const minute = Number(notificationMinuteInput.trim());

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      showToast(t('settings.themeVerseNotificationInvalidTime'));
      return;
    }

    try {
      await setThemeVerseNotificationSettings({
        ...themeVerseNotificationSettings,
        hour,
        minute,
      });
      setNotificationTimeSheetVisible(false);
    } catch {
      showToast(t('settings.themeVerseNotificationUpdateFailed'));
    }
  }, [
    notificationHourInput,
    notificationMinuteInput,
    setThemeVerseNotificationSettings,
    showToast,
    t,
    themeVerseNotificationSettings,
  ]);

  const handleDeleteAccount = useCallback(() => {
    if (!isConfigured || !currentUser) return;

    if (superAdminChurches.length > 0) {
      showToast(t('settings.deleteAccountBlockedBySuperAdminChurch'));
      return;
    }

    Alert.alert(t('settings.deleteAccountConfirmTitle'), t('settings.deleteAccountConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setIsSubmitting(true);
            try {
              await deleteAccount();
              showToast(t('settings.deleteAccountSuccess'));
            } catch (deleteError) {
              showToast(getDeleteAccountErrorMessage(deleteError, t));
            } finally {
              setIsSubmitting(false);
            }
          })();
        },
      },
    ]);
  }, [currentUser, deleteAccount, isConfigured, showToast, superAdminChurches.length, t]);

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
        <View style={{ width: '100%', maxWidth: narrowPageMaxWidth, alignSelf: 'center' }}>
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
                  <Button
                    onPress={() => {
                      setDisplayNameInput(displayName);
                      setDisplayNameSheetVisible(true);
                    }}
                    disabled={isLoadingDisplayName}
                    className="h-auto rounded-2xl bg-primary-500 px-4 py-3"
                  >
                    <ButtonText className="font-semibold text-white dark:text-gray-900">{t('settings.changeDisplayName')}</ButtonText>
                  </Button>
                </View>
              </View>

              <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.emailVisibility')}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.emailVisibilityDescription')}
                </Text>
                <View className="mt-3 flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base text-gray-900 dark:text-white">
                      {currentUser.email ?? t('settings.emailVisibilityUnavailable')}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {showEmailInProfile ? t('settings.emailVisible') : t('settings.emailHidden')}
                    </Text>
                  </View>
                  <Button
                    onPress={() => void handleEmailVisibilityToggle()}
                    disabled={isUpdatingEmailVisibility || !currentUser.email}
                    className={`h-auto rounded-2xl px-4 py-3 ${
                      isUpdatingEmailVisibility || !currentUser.email
                        ? 'bg-gray-300 dark:bg-gray-700'
                        : 'bg-primary-500'
                    }`}
                  >
                    <ButtonText className="font-semibold text-white dark:text-gray-900">
                      {showEmailInProfile ? t('settings.hideEmail') : t('settings.showEmail')}
                    </ButtonText>
                  </Button>
                </View>
              </View>

              <Button
                onPress={handleLogout}
                disabled={isSubmitting}
                action="secondary"
                variant="outline"
                className="mt-4 h-auto rounded-2xl border-gray-200 px-4 py-4 dark:border-gray-800"
              >
                <ButtonText className="font-semibold text-gray-900 dark:text-white">{t('settings.logout')}</ButtonText>
              </Button>
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

              <Button
                onPress={() => void handleEmailAuth()}
                disabled={isSubmitting}
                className={`h-auto rounded-2xl px-4 py-4 ${
                  isSubmitting ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
                }`}
              >
                <ButtonText className="font-semibold text-white">
                  {isSignUpMode ? t('settings.signUp') : t('settings.signIn')}
                </ButtonText>
              </Button>

              <Button
                onPress={() => setIsSignUpMode((previous) => !previous)}
                disabled={isSubmitting}
                action="secondary"
                variant="outline"
                className="mt-3 h-auto rounded-2xl border-gray-200 px-4 py-4 dark:border-gray-800"
              >
                <ButtonText className="font-semibold text-gray-900 dark:text-white">
                  {isSignUpMode ? t('settings.switchToSignIn') : t('settings.switchToSignUp')}
                </ButtonText>
              </Button>

              <View className="mt-3 flex-row gap-3">
                <Pressable
                  onPress={() => void handleSocialLogin('google')}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.googleLogin')}
                  className={`flex-1 items-center justify-center rounded-2xl border px-4 py-4 ${
                    isSubmitting
                      ? 'border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900'
                      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
                  }`}
                  style={{ minHeight: scale(56) }}
                >
                  <GoogleIcon color={socialLoginIconColor} />
                </Pressable>
                <Pressable
                  onPress={() => void handleSocialLogin('kakao')}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.kakaoLogin')}
                  className={`flex-1 items-center justify-center rounded-2xl border px-4 py-4 ${
                    isSubmitting
                      ? 'border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900'
                      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
                  }`}
                  style={{ minHeight: scale(56) }}
                >
                  <KakaoIcon color={socialLoginIconColor} />
                </Pressable>
                {shouldShowAppleLogin ? (
                  <Pressable
                    onPress={() => void handleSocialLogin('apple')}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.appleLogin')}
                    className={`flex-1 items-center justify-center rounded-2xl border px-4 py-4 ${
                      isSubmitting
                        ? 'border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900'
                        : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
                    }`}
                    style={{ minHeight: scale(56) }}
                  >
                    <AppleIcon color={socialLoginIconColor} />
                  </Pressable>
                ) : null}
              </View>
            </>
          )}

        </View>

        <AdBanner />

        <View className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
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

        {Platform.OS !== 'web' ? (
          <View className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('settings.themeVerseNotificationTitle')}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {t('settings.themeVerseNotificationDescription')}
            </Text>

            <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-950">
              <View className="flex-1 pr-4">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('settings.themeVerseNotificationEnabledLabel')}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {themeVerseNotificationSettings.enabled
                    ? t('settings.themeVerseNotificationEnabledHint')
                    : t('settings.themeVerseNotificationDisabledHint')}
                </Text>
              </View>
              <Switch
                value={themeVerseNotificationSettings.enabled}
                disabled={!isReady}
                onValueChange={(value) => void handleThemeVerseNotificationToggle(value)}
              />
            </View>

            <Text className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('settings.themeVerseNotificationDaysLabel')}
            </Text>
            <View className="mt-2 flex-row flex-wrap" style={{ gap: scale(8) }}>
              {THEME_VERSE_NOTIFICATION_WEEKDAYS.map((weekday, index) => {
                const selected = themeVerseNotificationSettings.weekdays.includes(weekday);

                return (
                  <Pressable
                    key={`theme-verse-notification-weekday-${weekday}`}
                    disabled={!isReady}
                    onPress={() => void handleThemeVerseNotificationWeekdayToggle(weekday)}
                    className={`rounded-full px-4 py-3 ${
                      selected
                        ? 'border-2 border-primary-600 bg-white dark:border-primary-400 dark:bg-gray-950'
                        : 'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        selected
                          ? 'font-bold text-primary-700 dark:text-primary-300'
                          : 'font-semibold text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {themeVerseNotificationWeekdayLabels[index]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('settings.themeVerseNotificationTimeLabel')}
            </Text>
            <Pressable
              onPress={handleOpenNotificationTimeSheet}
              disabled={!isReady}
              className="mt-2 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-950"
            >
              <View>
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {formattedThemeVerseNotificationTime}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.themeVerseNotificationTimeHint')}
                </Text>
              </View>
              <IconSymbol
                name="chevron.right"
                size={moderateScale(18)}
                color={theme === 'light' ? '#374151' : '#9ca3af'}
              />
            </Pressable>

            <Text className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {t('settings.themeVerseNotificationFootnote')}
            </Text>
          </View>
        ) : null}

        {Platform.OS !== 'web' ? (
          <View className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('settings.bibleMeditationNotificationTitle')}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {t('settings.bibleMeditationNotificationDescription')}
            </Text>

            <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-950">
              <View className="flex-1 pr-4">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('settings.bibleMeditationNotificationEnabledLabel')}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {bibleMeditationNotificationEnabled
                    ? t('settings.bibleMeditationNotificationEnabledHint')
                    : t('settings.bibleMeditationNotificationDisabledHint')}
                </Text>
              </View>
              <Switch
                value={bibleMeditationNotificationEnabled}
                disabled={!isReady}
                onValueChange={(value) => void handleBibleMeditationNotificationToggle(value)}
              />
            </View>
          </View>
        ) : null}

        <View className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('settings.developerInquiry')}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {isConfigured
              ? t('settings.developerInquiryDescription')
              : t('settings.developerInquiryUnavailable')}
          </Text>
          <Button
            onPress={handleOpenDeveloperInquirySheet}
            disabled={!isConfigured || isSubmittingDeveloperInquiry}
            className={`mt-4 h-auto rounded-2xl px-4 py-4 ${
              !isConfigured || isSubmittingDeveloperInquiry
                ? 'bg-gray-300 dark:bg-gray-700'
                : 'bg-primary-500'
            }`}
          >
            <ButtonText className="font-semibold text-white dark:text-gray-900">{t('settings.developerInquiryOpen')}</ButtonText>
          </Button>
        </View>

        {currentUser ? (
          <View className="mt-6 rounded-3xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-gray-900">
            <Text className="text-sm font-medium text-red-500 dark:text-red-400">
              {t('settings.deleteAccount')}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {superAdminChurches.length > 0
                ? t('settings.deleteAccountBlockedBySuperAdminChurch')
                : t('settings.deleteAccountDescription')}
            </Text>
            <Button
              onPress={handleDeleteAccount}
              disabled={isSubmitting}
              action="negative"
              className={`mt-4 h-auto rounded-2xl px-4 py-4 ${
                isSubmitting ? 'bg-red-300 dark:bg-red-950/50' : 'bg-red-500'
              }`}
            >
              <ButtonText className="font-semibold text-white">{t('settings.deleteAccount')}</ButtonText>
            </Button>
          </View>
        ) : null}
        </View>
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
            <Button
              onPress={() => void handleDisplayNameSave()}
              disabled={isUpdatingDisplayName}
              className={`mt-5 h-auto rounded-2xl px-4 py-4 ${
                isUpdatingDisplayName ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
              }`}
            >
              <ButtonText className="font-semibold text-white dark:text-gray-900">{t('settings.displayNameSave')}</ButtonText>
            </Button>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={notificationTimeSheetVisible}
        onClose={() => setNotificationTimeSheetVisible(false)}
        heightFraction={0.45}
      >
        <View className="flex-1">
          <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.themeVerseNotificationTimeSheetTitle')}
            </Text>
          </View>
          <View className="px-6 py-6">
            <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('settings.themeVerseNotificationTimeHourLabel')}
            </Text>
            <TextInput
              value={notificationHourInput}
              onChangeText={setNotificationHourInput}
              placeholder="09"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={2}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />

            <Text className="mb-2 mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('settings.themeVerseNotificationTimeMinuteLabel')}
            </Text>
            <TextInput
              value={notificationMinuteInput}
              onChangeText={setNotificationMinuteInput}
              placeholder="00"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={2}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />

            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('settings.themeVerseNotificationTimeSheetHint')}
            </Text>

            <Button
              onPress={() => void handleSaveNotificationTime()}
              disabled={!isReady}
              className={`mt-5 h-auto rounded-2xl px-4 py-4 ${
                !isReady ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
              }`}
            >
              <ButtonText className="font-semibold text-white dark:text-gray-900">
                {t('settings.themeVerseNotificationTimeSave')}
              </ButtonText>
            </Button>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={developerInquirySheetVisible}
        onClose={() => {
          if (isSubmittingDeveloperInquiry) return;
          setDeveloperInquirySheetVisible(false);
        }}
        heightFraction={0.76}
      >
        <View className="flex-1">
          <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.developerInquiryModalTitle')}
            </Text>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 }}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="mb-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {t('settings.developerInquiryDescription')}
            </Text>

            <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('settings.developerInquiryAuthorNameLabel')}
            </Text>
            <TextInput
              value={developerInquiryAuthorName}
              onChangeText={setDeveloperInquiryAuthorName}
              placeholder={t('settings.developerInquiryAuthorNamePlaceholder')}
              placeholderTextColor="#9ca3af"
              maxLength={40}
              className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />

            <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('settings.developerInquirySubjectLabel')}
            </Text>
            <TextInput
              value={developerInquiryTitle}
              onChangeText={setDeveloperInquiryTitle}
              placeholder={t('settings.developerInquirySubjectPlaceholder')}
              placeholderTextColor="#9ca3af"
              maxLength={120}
              className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />

            <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('settings.developerInquiryContentLabel')}
            </Text>
            <TextInput
              value={developerInquiryContent}
              onChangeText={setDeveloperInquiryContent}
              placeholder={t('settings.developerInquiryContentPlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={4000}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              style={{ minHeight: 160, textAlignVertical: 'top' }}
            />

            <Button
              onPress={() => void handleSubmitDeveloperInquiry()}
              disabled={isSubmittingDeveloperInquiry}
              className={`mt-5 h-auto rounded-2xl px-4 py-4 ${
                isSubmittingDeveloperInquiry ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
              }`}
            >
              <ButtonText className="font-semibold text-white dark:text-gray-900">{t('settings.developerInquirySubmit')}</ButtonText>
            </Button>
          </ScrollView>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
