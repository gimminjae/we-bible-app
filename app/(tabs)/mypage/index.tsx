import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/ads/ad-banner';
import { BibleGrass } from '@/components/bible-grass';
import { ThemeVerseSummaryCard } from '@/components/mypage/theme-verse-summary-card';
import { AppIcon, FeatureHeading, FeatureIcon, type AppIconName } from '@/components/ui/feature';
import { featureColors, type FeatureTone } from '@/constants/app-design';
import { useAppSettings } from '@/contexts/app-settings';
import { useAuth } from '@/contexts/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';
import {
  getCurrentThemeVerseYear,
  getThemeVerseByYear,
  type ThemeVerseRecord,
} from '@/utils/theme-verse-db';

export default function MyPageScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { theme } = useAppSettings();
  const { scale, moderateScale, pageMaxWidth } = useResponsive();
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const currentYear = getCurrentThemeVerseYear();
  const [currentThemeVerse, setCurrentThemeVerse] = useState<ThemeVerseRecord | null>(null);
  const [isLoadingThemeVerse, setIsLoadingThemeVerse] = useState(true);

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)));

  const loadThemeVerse = useCallback(() => {
    let active = true;

    const load = async () => {
      if (active) {
        setIsLoadingThemeVerse(true);
      }

      if (isAccountDataPending) {
        if (active) {
          setCurrentThemeVerse(null);
        }
        return;
      }

      try {
        const row = await getThemeVerseByYear(db, currentYear);
        if (!active) return;
        setCurrentThemeVerse(row);
      } catch {
        if (active) {
          setCurrentThemeVerse(null);
        }
      } finally {
        if (active) {
          setIsLoadingThemeVerse(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [currentUser, currentYear, db, isAccountDataPending, isConfigured]);

  useFocusEffect(loadThemeVerse);

  const renderMenuCard = (
    key: string,
    label: string,
    icon: AppIconName,
    tone: FeatureTone,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      className="mb-3 flex-row items-center justify-between rounded-3xl border bg-white active:opacity-75 dark:bg-gray-900"
      style={{
        paddingHorizontal: scale(16),
        paddingVertical: scale(18),
        borderColor: featureColors[tone][theme].border,
      }}
    >
      <View className="min-w-0 flex-1 flex-row items-center" style={{ gap: scale(14) }}>
        <FeatureIcon name={icon} tone={tone} size={48} />
        <Text
          style={{ fontSize: moderateScale(16) }}
          className="flex-1 font-semibold text-gray-900 dark:text-white"
        >
          {label}
        </Text>
      </View>
      <AppIcon name="arrow-forward" tone={tone} size={18} />
    </Pressable>
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
        <View style={{ width: '100%', maxWidth: pageMaxWidth, alignSelf: 'center' }}>
          <FeatureHeading title={t('mypage.title')} icon="sparkles-outline" tone="prayer" />

          <ThemeVerseSummaryCard
            year={currentYear}
            themeVerse={currentThemeVerse}
            isLoading={isLoadingThemeVerse}
            onPress={() => router.push('/(tabs)/mypage/theme-verse')}
          />

          <BibleGrass />

          <View className="mb-4">
            <AdBanner />
          </View>

          {renderMenuCard(
            'favorites',
            t('mypage.favoritesMenu'),
            'heart-outline',
            'favorite',
            () => router.push('/(tabs)/mypage/favorites'),
          )}

          {renderMenuCard(
            'memos',
            t('mypage.memosMenu'),
            'create-outline',
            'memo',
            () => router.push('/(tabs)/mypage/memos'),
          )}

          {renderMenuCard(
            'prayers',
            t('mypage.prayersMenu'),
            'heart-circle-outline',
            'prayer',
            () => router.push('/(tabs)/mypage/prayers'),
          )}

          {renderMenuCard(
            'plans',
            t('mypage.plansMenu'),
            'calendar-outline',
            'bible',
            () => router.push('/(tabs)/mypage/plans'),
          )}

          {renderMenuCard(
            'churches',
            t('church.title'),
            'people-outline',
            'community',
            () => router.push('/churches' as never),
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
