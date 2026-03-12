import { AdBanner } from '@/components/ads/ad-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppSettings } from '@/contexts/app-settings';
import { useResponsive } from '@/hooks/use-responsive';
import type { AppLanguage } from '@/utils/app-settings-storage';
import { exportSQLiteData, importSQLiteData } from '@/utils/db-export';
import { useI18n } from '@/utils/i18n';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { theme, setTheme, appLanguage, setAppLanguage } = useAppSettings();
  const { t } = useI18n();
  const { scale, moderateScale } = useResponsive();
  const [languageSelectOpen, setLanguageSelectOpen] = useState(false);
  const [exportImportGuideOpen, setExportImportGuideOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [setTheme, theme]);

  const handleSelectLanguage = useCallback(
    (value: AppLanguage) => {
      setAppLanguage(value);
      setLanguageSelectOpen(false);
    },
    [setAppLanguage]
  );

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportSQLiteData(db);
      Alert.alert(t('settings.exportSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      Alert.alert(t('settings.exportFailed'), message);
    } finally {
      setIsExporting(false);
    }
  }, [db, isExporting, t]);

  const handleImport = useCallback(async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const fileName = await importSQLiteData(db);
      if (fileName) {
        Alert.alert(t('settings.importSuccess'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      Alert.alert(t('settings.importFailed'), message);
    } finally {
      setIsImporting(false);
    }
  }, [db, isImporting, t]);

  const currentLanguageLabel = useMemo(
    () => LANGUAGE_OPTIONS.find((o) => o.value === appLanguage)?.label ?? '한국어',
    [appLanguage]
  );

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

        <View style={{ marginBottom: scale(24) }}>
          <Text
            className="font-medium text-gray-500 dark:text-gray-400"
            style={{ fontSize: moderateScale(14), marginBottom: scale(8) }}
          >
            {t('settings.systemLanguage')}
          </Text>
          <Pressable
            onPress={() => setLanguageSelectOpen(true)}
            className="flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            style={{
              paddingHorizontal: scale(16),
              paddingVertical: scale(12),
            }}
          >
            <Text style={{ fontSize: moderateScale(16) }} className="text-gray-900 dark:text-white">
              {currentLanguageLabel}
            </Text>
            <IconSymbol
              name="chevron.down"
              size={moderateScale(18)}
              color={theme === 'light' ? '#374151' : '#9ca3af'}
            />
          </Pressable>
        </View>

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
            <Text style={{ fontSize: moderateScale(16) }} className="text-gray-900 dark:text-white">
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

        <View style={{ marginBottom: scale(24) }}>
          <View className="flex-row items-center" style={{ marginBottom: scale(8), gap: scale(6) }}>
            <Text
              className="font-medium text-gray-500 dark:text-gray-400"
              style={{ fontSize: moderateScale(14) }}
            >
              {t('settings.account')}
            </Text>
            <Pressable
              onPress={() => setExportImportGuideOpen(true)}
              hitSlop={scale(8)}
              className="active:opacity-70"
            >
              <IconSymbol name="exclamationmark.circle.fill" size={moderateScale(18)} color="#9ca3af" />
            </Pressable>
          </View>
          <View
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            style={{
              paddingHorizontal: scale(16),
              paddingVertical: scale(14),
              gap: scale(12),
            }}
          >
            <Text
              className="text-gray-700 dark:text-gray-300"
              style={{ fontSize: moderateScale(13), lineHeight: moderateScale(19) }}
            >
              {t('settings.exportDesc')}
            </Text>
            <View className="flex-row" style={{ gap: scale(8) }}>
              <Pressable
                onPress={handleExport}
                disabled={isExporting || isImporting}
                className="flex-1 rounded-lg bg-primary-500 items-center justify-center active:opacity-90"
                style={{ height: scale(44), opacity: isExporting || isImporting ? 0.6 : 1 }}
              >
                <Text className="font-semibold text-white" style={{ fontSize: moderateScale(14) }}>
                  {isExporting ? t('settings.exporting') : t('settings.exportDb')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleImport}
                disabled={isExporting || isImporting}
                className="flex-1 rounded-lg bg-gray-200 dark:bg-gray-700 items-center justify-center active:opacity-90"
                style={{ height: scale(44), opacity: isExporting || isImporting ? 0.6 : 1 }}
              >
                <Text
                  className="font-semibold text-gray-800 dark:text-gray-100"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {isImporting ? t('settings.importing') : t('settings.importDb')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <AdBanner />
      </ScrollView>

      <Modal
        visible={exportImportGuideOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExportImportGuideOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setExportImportGuideOpen(false)}
          style={{ paddingHorizontal: scale(24) }}
        >
          <Pressable
            className="rounded-2xl bg-white dark:bg-gray-900 w-full"
            style={{ paddingHorizontal: scale(20), paddingVertical: scale(20), maxWidth: 360 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="font-semibold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(18), marginBottom: scale(12) }}
            >
              {t('settings.exportImportGuideTitle')}
            </Text>
            <Text
              className="text-gray-700 dark:text-gray-300"
              style={{ fontSize: moderateScale(14), lineHeight: moderateScale(22) }}
            >
              {t('settings.exportImportGuideBody')}
            </Text>
            <Pressable
              onPress={() => setExportImportGuideOpen(false)}
              className="mt-4 rounded-lg bg-primary-500 items-center justify-center active:opacity-90"
              style={{ paddingVertical: scale(12) }}
            >
              <Text className="font-semibold text-white" style={{ fontSize: moderateScale(15) }}>
                {t('common.confirm')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={languageSelectOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageSelectOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setLanguageSelectOpen(false)}>
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
