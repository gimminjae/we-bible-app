import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppSettings } from '@/contexts/app-settings';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';
import type { AppLanguage } from '@/utils/app-settings-storage';

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const { theme, setTheme, appLanguage, setAppLanguage } = useAppSettings();
  const { t } = useI18n();
  const { scale, moderateScale } = useResponsive();
  const [languageSelectOpen, setLanguageSelectOpen] = useState(false);

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
    </SafeAreaView>
  );
}
