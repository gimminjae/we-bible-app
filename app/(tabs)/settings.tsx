import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppSettings } from '@/contexts/app-settings';
import { useAuth } from '@/contexts/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import type { AppLanguage } from '@/utils/app-settings-storage';
import { useI18n } from '@/utils/i18n';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

export default function SettingsScreen() {
  const { theme, setTheme, appLanguage, setAppLanguage } = useAppSettings();
  const { session, loading: authLoading, isConfigured, signIn, signUp, signInWithGoogle, signOut } = useAuth();
  const { t } = useI18n();
  const { scale, moderateScale } = useResponsive();
  const [languageSelectOpen, setLanguageSelectOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const handleOpenLanguageSelect = useCallback(() => {
    setLanguageSelectOpen(true);
  }, []);

  const handleCloseLanguageSelect = useCallback(() => {
    setLanguageSelectOpen(false);
  }, []);

  const handleSelectLanguage = useCallback(
    (value: AppLanguage) => {
      setAppLanguage(value);
      setLanguageSelectOpen(false);
    },
    [setAppLanguage]
  );

  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === appLanguage)?.label ?? '한국어';

  const handleOpenAuthModal = useCallback(() => {
    setAuthMode('signIn');
    setAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthMode('signIn');
    setPassword('');
    setConfirmPassword('');
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmPasswordTouched(false);
  }, []);

  const handleSignIn = useCallback(async () => {
    setAuthSubmitting(true);
    const { error } = await signIn({
      email: email.trim(),
      password,
    });
    setAuthSubmitting(false);
    if (error) {
      Alert.alert(t('settings.loginFailed'), error.message);
      return;
    }
    setAuthModalOpen(false);
    setPassword('');
  }, [email, password, signIn, t]);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthSubmitting(true);
    const { error } = await signInWithGoogle();
    setAuthSubmitting(false);
    if (error) {
      Alert.alert(t('settings.googleLoginFailed'), error.message);
      return;
    }
    setAuthModalOpen(false);
  }, [signInWithGoogle, t]);

  const signUpEmailError = !email.trim()
    ? t('settings.requiredEmail')
    : !EMAIL_REGEX.test(email.trim())
      ? t('settings.invalidEmail')
      : '';
  const signUpPasswordError = !password
    ? t('settings.requiredPassword')
    : !PASSWORD_REGEX.test(password)
      ? t('settings.invalidPasswordRule')
      : '';
  const signUpConfirmPasswordError = !confirmPassword
    ? t('settings.requiredConfirmPassword')
    : password !== confirmPassword
      ? t('settings.passwordMismatch')
      : '';
  const hasSignUpErrors = Boolean(
    signUpEmailError || signUpPasswordError || signUpConfirmPasswordError
  );

  const handleSignUp = useCallback(async () => {
    if (hasSignUpErrors) {
      setEmailTouched(true);
      setPasswordTouched(true);
      setConfirmPasswordTouched(true);
      return;
    }
    setAuthSubmitting(true);
    const { error } = await signUp({
      email: email.trim(),
      password,
    });
    setAuthSubmitting(false);
    if (error) {
      Alert.alert(t('settings.signUpFailed'), error.message);
      return;
    }
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmPasswordTouched(false);
    setAuthMode('signIn');
    Alert.alert(t('settings.emailVerifyHint'));
  }, [hasSignUpErrors, signUp, email, password, t]);

  const handleSignOut = useCallback(async () => {
    const { error } = await signOut();
    if (error) {
      Alert.alert(t('settings.logoutFailed'), error.message);
    }
  }, [signOut, t]);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(20),
          paddingTop: scale(24),
          paddingBottom: scale(40),
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: moderateScale(24), marginBottom: scale(32) }}
        >
          {t('settings.title')}
        </Text>

        {/* 시스템 언어 */}
        <View style={{ marginBottom: scale(24) }}>
          <Text
            className="font-medium text-gray-500 dark:text-gray-400"
            style={{ fontSize: moderateScale(14), marginBottom: scale(8) }}
          >
            {t('settings.systemLanguage')}
          </Text>
          <Pressable
            onPress={handleOpenLanguageSelect}
            className="flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            style={{
              paddingHorizontal: scale(16),
              paddingVertical: scale(12),
            }}
          >
            <Text
              style={{ fontSize: moderateScale(16) }}
              className="text-gray-900 dark:text-white"
            >
              {currentLanguageLabel}
            </Text>
            <IconSymbol
              name="chevron.down"
              size={moderateScale(18)}
              color={theme === 'light' ? '#374151' : '#9ca3af'}
            />
          </Pressable>
        </View>

        {/* 화이트/다크 모드 */}
        <View style={{ marginBottom: scale(24) }}>
          <Text
            className="font-medium text-gray-500 dark:text-gray-400"
            style={{ fontSize: moderateScale(14), marginBottom: scale(8) }}
          >
            {t('settings.theme')}
          </Text>
          <Pressable
            onPress={handleToggleTheme}
            className="flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            style={{
              paddingHorizontal: scale(16),
              paddingVertical: scale(12),
            }}
          >
            <Text
              style={{ fontSize: moderateScale(16) }}
              className="text-gray-900 dark:text-white"
            >
              {theme === 'light' ? t('settings.lightMode') : t('settings.darkMode')}
            </Text>
            <View
              className="rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              style={{ width: scale(40), height: scale(40) }}
            >
              <IconSymbol
                name={theme === 'light' ? 'moon.fill' : 'sun.max.fill'}
                size={moderateScale(22)}
                color={theme === 'light' ? '#374151' : '#f59e0b'}
              />
            </View>
          </Pressable>
        </View>

        {/* 계정 연동 */}
        <View style={{ marginBottom: scale(24) }}>
          <Text
            className="font-medium text-gray-500 dark:text-gray-400"
            style={{ fontSize: moderateScale(14), marginBottom: scale(8) }}
          >
            {t('settings.account')}
          </Text>
          <View
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            style={{
              paddingHorizontal: scale(16),
              paddingVertical: scale(12),
              gap: scale(10),
            }}
          >
            {!isConfigured ? (
              <Text
                className="text-gray-500 dark:text-gray-400"
                style={{ fontSize: moderateScale(14) }}
              >
                {t('settings.authNotConfigured')}
              </Text>
            ) : authLoading ? (
              <Text
                className="text-gray-500 dark:text-gray-400"
                style={{ fontSize: moderateScale(14) }}
              >
                {t('settings.authChecking')}
              </Text>
            ) : session?.user ? (
              <>
                <Text
                  className="text-gray-700 dark:text-gray-300"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {t('settings.accountConnected')}
                </Text>
                <Text
                  className="text-gray-900 dark:text-white"
                  style={{ fontSize: moderateScale(16) }}
                >
                  {session.user.email}
                </Text>
                <Pressable
                  onPress={handleSignOut}
                  className="self-start rounded-lg bg-gray-200 dark:bg-gray-700 active:opacity-80"
                  style={{ paddingHorizontal: scale(12), paddingVertical: scale(8) }}
                >
                  <Text
                    className="font-semibold text-gray-800 dark:text-gray-100"
                    style={{ fontSize: moderateScale(14) }}
                  >
                    {t('settings.logout')}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text
                  className="text-gray-500 dark:text-gray-400"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {t('settings.accountGuest')}
                </Text>
                <Pressable
                  onPress={handleOpenAuthModal}
                  className="self-start rounded-lg bg-primary-500 active:opacity-90"
                  style={{ paddingHorizontal: scale(14), paddingVertical: scale(9) }}
                >
                  <Text
                    className="font-semibold text-white"
                    style={{ fontSize: moderateScale(14) }}
                  >
                    {t('settings.login')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={languageSelectOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseLanguageSelect}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={handleCloseLanguageSelect}
        >
          <Pressable
            className="bg-gray-50 dark:bg-gray-900 rounded-t-2xl"
            style={{
              paddingHorizontal: scale(16),
              paddingBottom: scale(32),
              paddingTop: scale(16),
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="font-semibold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(18), marginBottom: scale(16) }}
            >
              {t('settings.languageSelect')}
            </Text>
            {LANGUAGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleSelectLanguage(opt.value)}
                className="rounded-xl active:bg-gray-200 dark:active:bg-gray-800"
                style={{ paddingVertical: scale(14) }}
              >
                <Text
                  style={{ fontSize: moderateScale(16) }}
                  className="text-gray-900 dark:text-white"
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={authModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAuthModal}
      >
        <Pressable className="flex-1 bg-black/40 justify-center px-5" onPress={handleCloseAuthModal}>
          <Pressable
            className="rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            style={{ paddingHorizontal: scale(16), paddingVertical: scale(16) }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="font-semibold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(18), marginBottom: scale(16) }}
            >
              {authMode === 'signIn' ? t('settings.signIn') : t('settings.signUp')}
            </Text>
            <View
              className="flex-row rounded-lg bg-gray-100 dark:bg-gray-800"
              style={{ padding: scale(4), marginBottom: scale(14) }}
            >
              <Pressable
                onPress={() => {
                  setAuthMode('signIn');
                  setEmailTouched(false);
                  setPasswordTouched(false);
                  setConfirmPasswordTouched(false);
                }}
                className={`flex-1 items-center justify-center rounded-md ${authMode === 'signIn' ? 'bg-white dark:bg-gray-700' : ''
                  }`}
                style={{ height: scale(36) }}
              >
                <Text
                  className={`font-semibold ${authMode === 'signIn'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                    }`}
                  style={{ fontSize: moderateScale(13) }}
                >
                  {t('settings.signIn')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAuthMode('signUp');
                  setEmailTouched(false);
                  setPasswordTouched(false);
                  setConfirmPasswordTouched(false);
                }}
                className={`flex-1 items-center justify-center rounded-md ${authMode === 'signUp' ? 'bg-white dark:bg-gray-700' : ''
                  }`}
                style={{ height: scale(36) }}
              >
                <Text
                  className={`font-semibold ${authMode === 'signUp'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                    }`}
                  style={{ fontSize: moderateScale(13) }}
                >
                  {t('settings.signUp')}
                </Text>
              </Pressable>
            </View>

            <Text
              className="font-medium text-gray-500 dark:text-gray-400"
              style={{ fontSize: moderateScale(13), marginBottom: scale(6) }}
            >
              {t('settings.email')}
            </Text>
            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (authMode === 'signUp') setEmailTouched(true);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email@address.com"
              placeholderTextColor="#9ca3af"
              className="rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
              style={{
                paddingHorizontal: scale(12),
                paddingVertical: scale(10),
                fontSize: moderateScale(15),
                marginBottom:
                  authMode === 'signUp' && emailTouched && signUpEmailError
                    ? scale(4)
                    : scale(12),
              }}
            />
            {authMode === 'signUp' && emailTouched && signUpEmailError ? (
              <Text
                className="text-red-500"
                style={{ fontSize: moderateScale(12), marginBottom: scale(10) }}
              >
                {signUpEmailError}
              </Text>
            ) : null}

            <Text
              className="font-medium text-gray-500 dark:text-gray-400"
              style={{ fontSize: moderateScale(13), marginBottom: scale(6) }}
            >
              {t('settings.password')}
            </Text>
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (authMode === 'signUp') setPasswordTouched(true);
              }}
              secureTextEntry
              autoCapitalize="none"
              placeholder="********"
              placeholderTextColor="#9ca3af"
              className="rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
              style={{
                paddingHorizontal: scale(12),
                paddingVertical: scale(10),
                fontSize: moderateScale(15),
                marginBottom:
                  authMode === 'signUp' && passwordTouched && signUpPasswordError
                    ? scale(4)
                    : scale(16),
              }}
            />
            {authMode === 'signUp' && passwordTouched && signUpPasswordError ? (
              <Text
                className="text-red-500"
                style={{ fontSize: moderateScale(12), marginBottom: scale(10) }}
              >
                {signUpPasswordError}
              </Text>
            ) : null}
            {authMode === 'signUp' ? (
              <>
                <Text
                  className="font-medium text-gray-500 dark:text-gray-400"
                  style={{ fontSize: moderateScale(13), marginBottom: scale(6) }}
                >
                  {t('settings.confirmPassword')}
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setConfirmPasswordTouched(true);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="********"
                  placeholderTextColor="#9ca3af"
                  className="rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                  style={{
                    paddingHorizontal: scale(12),
                    paddingVertical: scale(10),
                    fontSize: moderateScale(15),
                    marginBottom:
                      confirmPasswordTouched && signUpConfirmPasswordError
                        ? scale(4)
                        : scale(16),
                  }}
                />
                {confirmPasswordTouched && signUpConfirmPasswordError ? (
                  <Text
                    className="text-red-500"
                    style={{ fontSize: moderateScale(12), marginBottom: scale(10) }}
                  >
                    {signUpConfirmPasswordError}
                  </Text>
                ) : null}
              </>
            ) : null}

            <View className="flex-row" style={{ gap: scale(10) }}>
              <Pressable
                onPress={authMode === 'signIn' ? handleSignIn : handleSignUp}
                disabled={authSubmitting || (authMode === 'signUp' && hasSignUpErrors)}
                className="flex-1 rounded-lg bg-primary-500 items-center justify-center active:opacity-90"
                style={{
                  height: scale(44),
                  opacity:
                    authSubmitting || (authMode === 'signUp' && hasSignUpErrors)
                      ? 0.5
                      : 1,
                }}
              >
                <Text className="font-semibold text-white" style={{ fontSize: moderateScale(14) }}>
                  {authMode === 'signIn' ? t('settings.signIn') : t('settings.signUp')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
                  setEmailTouched(false);
                  setPasswordTouched(false);
                  setConfirmPasswordTouched(false);
                }}
                disabled={authSubmitting}
                className="rounded-lg bg-gray-200 dark:bg-gray-700 items-center justify-center active:opacity-90"
                style={{ height: scale(44), paddingHorizontal: scale(14), opacity: authSubmitting ? 0.7 : 1 }}
              >
                <Text
                  className="font-semibold text-gray-800 dark:text-gray-100"
                  style={{ fontSize: moderateScale(13) }}
                >
                  {authMode === 'signIn'
                    ? t('settings.switchToSignUp')
                    : t('settings.switchToSignIn')}
                </Text>
              </Pressable>
            </View>
            {authMode === 'signIn' ? (
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={authSubmitting}
                className="mt-3 rounded-lg bg-white border border-gray-300 items-center justify-center active:opacity-90"
                style={{ height: scale(44), opacity: authSubmitting ? 0.6 : 1 }}
              >
                <View className="flex-row items-center" style={{ gap: scale(8) }}>
                  <View
                    className="items-center justify-center rounded-full bg-blue-500"
                    style={{ width: scale(20), height: scale(20) }}
                  >
                    <Text
                      className="font-bold text-white"
                      style={{ fontSize: moderateScale(12), lineHeight: moderateScale(12) }}
                    >
                      G
                    </Text>
                  </View>
                  <Text
                    className="font-semibold text-gray-900"
                    style={{ fontSize: moderateScale(14) }}
                  >
                    {t('settings.googleLogin')}
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
