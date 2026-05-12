import { useState } from 'react';
import { ActivityIndicator, ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppSettings } from '@/contexts/app-settings';
import { useResponsive } from '@/hooks/use-responsive';
import { getBookName } from '@/services/bible';
import { useI18n } from '@/utils/i18n';
import { formatThemeVerseNumbers, type ThemeVerseRecord } from '@/utils/theme-verse-db';

type ThemeVerseSummaryCardProps = {
  year: number;
  themeVerse: ThemeVerseRecord | null;
  isLoading?: boolean;
  onPress: () => void;
};

function replaceToken(template: string, token: string, value: string) {
  return template.replace(`{${token}}`, value);
}

export function ThemeVerseSummaryCard({
  year,
  themeVerse,
  isLoading = false,
  onPress,
}: ThemeVerseSummaryCardProps) {
  const { t } = useI18n();
  const { appLanguage } = useAppSettings();
  const { scale, moderateScale, dialogMaxWidth } = useResponsive();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const citation = themeVerse
    ? `${getBookName(themeVerse.bookCode, appLanguage)} ${themeVerse.chapter}:${formatThemeVerseNumbers(themeVerse.verseNumbers)}`
    : '';

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={t('themeVerse.openDetail')}
        className="mb-4 rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        style={{
          paddingHorizontal: scale(18),
          paddingVertical: scale(18),
        }}
      >
        <View className="flex-row items-start justify-between" style={{ gap: scale(12) }}>
          <View className="min-w-0 flex-1">
            <Text
              className="text-sm p-3 font-semibold text-primary-600 dark:text-primary-400"
              style={{ fontSize: moderateScale(14) }}
            >
              {replaceToken(t('themeVerse.summaryLabel'), 'year', String(year))}
            </Text>
            {isLoading ? (
              <View
                className="mt-3 flex-row items-center"
                style={{ gap: scale(12), minHeight: moderateScale(58) }}
              >
                <ActivityIndicator color="#2563eb" />
                <View className="flex-1">
                  <View
                    className="h-3 rounded-full bg-primary-100 dark:bg-primary-950/40"
                    style={{ width: '72%' }}
                  />
                  <View
                    className="mt-3 h-3 rounded-full bg-gray-200 dark:bg-gray-800"
                    style={{ width: '48%' }}
                  />
                </View>
              </View>
            ) : themeVerse ? (
              <>
                <Text
                  className="mt-2 text-gray-900 dark:text-white"
                  style={{
                    fontSize: moderateScale(17),
                    lineHeight: moderateScale(26),
                  }}
                  numberOfLines={2}
                >
                  {replaceToken(t('themeVerse.summaryLeading'), 'year', String(year))} &quot;
                  {themeVerse.verseText}
                  &quot;
                </Text>
                <Text
                  className="mt-2 text-sm text-gray-500 dark:text-gray-400"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {citation}
                </Text>
              </>
            ) : (
              <Text
                className="mt-2 text-gray-500 dark:text-gray-400"
                style={{
                  fontSize: moderateScale(15),
                  lineHeight: moderateScale(24),
                }}
              >
                {replaceToken(t('themeVerse.summaryEmpty'), 'year', String(year))}
              </Text>
            )}
          </View>

          <View className="flex-row items-center" style={{ gap: scale(4) }}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setIsInfoOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('themeVerse.infoOpen')}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <IconSymbol name="exclamationmark.circle" size={moderateScale(18)} color="#6b7280" />
            </Pressable>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" />
            </View>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={isInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsInfoOpen(false)}
        statusBarTranslucent
      >
        <View className="flex-1 justify-center bg-black/60 px-5 py-10">
          <Pressable
            className="absolute inset-0"
            onPress={() => setIsInfoOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('themeVerse.infoClose')}
          />
          <View className="w-full overflow-hidden rounded-3xl" style={{ maxWidth: dialogMaxWidth }}>
            <ImageBackground
              source={require('../../assets/images/theme-verse-info-bg.png')}
              resizeMode="cover"
              style={{ minHeight: scale(500) }}
            >
              <View className="flex-1 justify-between overflow-hidden px-6 py-7">
                <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
                  <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
                    <Defs>
                      <RadialGradient id="themeVerseVignette" cx="50%" cy="42%" rx="80%" ry="80%">
                        <Stop offset="0%" stopColor="#000000" stopOpacity="0.05" />
                        <Stop offset="48%" stopColor="#000000" stopOpacity="0.18" />
                        <Stop offset="76%" stopColor="#000000" stopOpacity="0.42" />
                        <Stop offset="100%" stopColor="#000000" stopOpacity="0.68" />
                      </RadialGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#themeVerseVignette)" />
                  </Svg>
                </View>

                <View>
                  <View className="mb-4 flex-row items-start justify-between" style={{ gap: scale(12) }}>
                    <Text
                      className="flex-1 font-bold text-white"
                      style={{
                        fontSize: moderateScale(22),
                        lineHeight: moderateScale(30),
                        textShadowColor: 'rgba(0,0,0,0.32)',
                        textShadowRadius: 8,
                      }}
                    >
                      {t('themeVerse.infoTitle')}
                    </Text>
                    <Pressable
                      onPress={() => setIsInfoOpen(false)}
                      accessibilityRole="button"
                      accessibilityLabel={t('themeVerse.infoClose')}
                      className="h-10 w-10 items-center justify-center rounded-full bg-white/12"
                    >
                      <Text
                        className="text-white"
                        style={{ fontSize: moderateScale(18) }}
                      >
                        ✕
                      </Text>
                    </Pressable>
                  </View>

                  <Text
                    className="text-white"
                    style={{
                      fontSize: moderateScale(16),
                      lineHeight: moderateScale(29),
                      textShadowColor: 'rgba(0,0,0,0.28)',
                      textShadowRadius: 6,
                    }}
                  >
                    {t('themeVerse.infoBody')}
                  </Text>
                </View>

                <View className="rounded-3xl bg-black/30 px-5 py-5">
                  <Text
                    className="text-white"
                    style={{
                      fontSize: moderateScale(17),
                      lineHeight: moderateScale(30),
                      textShadowColor: 'rgba(0,0,0,0.3)',
                      textShadowRadius: 6,
                    }}
                  >
                    {t('themeVerse.infoQuote')}
                  </Text>
                  <Text
                    className="mt-3 text-white/85"
                    style={{ fontSize: moderateScale(13), letterSpacing: 0.4 }}
                  >
                    {t('themeVerse.infoQuoteReference')}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </View>
        </View>
      </Modal>
    </>
  );
}
