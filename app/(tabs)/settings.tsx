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
import type { AppLanguage } from '@/utils/app-settings-storage';

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const { theme, setTheme, appLanguage, setAppLanguage } = useAppSettings();
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          설정
        </Text>

        {/* 시스템 언어 */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            시스템 언어
          </Text>
          <Pressable
            onPress={handleOpenLanguageSelect}
            className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
            <Text className="text-base text-gray-900 dark:text-white">
              {currentLanguageLabel}
            </Text>
            <IconSymbol
              name="chevron.down"
              size={18}
              color={theme === 'light' ? '#374151' : '#9ca3af'}
            />
          </Pressable>
        </View>

        {/* 화이트/다크 모드 */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            테마
          </Text>
          <Pressable
            onPress={handleToggleTheme}
            className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
            <Text className="text-base text-gray-900 dark:text-white">
              {theme === 'light' ? '라이트 모드' : '다크 모드'}
            </Text>
            <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <IconSymbol
                name={theme === 'light' ? 'moon.fill' : 'sun.max.fill'}
                size={22}
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
            className="bg-gray-50 dark:bg-gray-900 rounded-t-2xl px-4 pb-8 pt-4"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              언어 선택
            </Text>
            {LANGUAGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleSelectLanguage(opt.value)}
                className="py-3.5 rounded-xl active:bg-gray-200 dark:active:bg-gray-800"
              >
                <Text className="text-base text-gray-900 dark:text-white">
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
