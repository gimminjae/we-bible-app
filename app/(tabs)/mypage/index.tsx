import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/ads/ad-banner';
import { BibleGrass } from '@/components/bible-grass';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';

export default function MyPageScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { scale, moderateScale } = useResponsive();

  const renderMenuCard = (
    key: string,
    label: string,
    icon: React.ReactNode,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      className="mb-4 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      style={{
        paddingHorizontal: scale(16),
        paddingVertical: scale(32),
      }}
    >
      <View className="flex-row items-center" style={{ gap: scale(12) }}>
        {icon}
        <Text
          style={{ fontSize: moderateScale(16) }}
          className="font-semibold text-gray-900 dark:text-white"
        >
          {label}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" />
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
        <View className="flex-row items-center justify-between" style={{ marginBottom: scale(16) }}>
          <Text
            className="font-bold text-gray-900 dark:text-white"
            style={{ fontSize: moderateScale(24) }}
          >
            {t('mypage.title')}
          </Text>
        </View>

        <BibleGrass />

        <View className="mb-4">
          <AdBanner />
        </View>

        {renderMenuCard(
          'favorites',
          t('mypage.favoritesMenu'),
          <IconSymbol name="heart.fill" size={moderateScale(20)} color="#ec4899" />,
          () => router.push('/(tabs)/mypage/favorites'),
        )}

        {renderMenuCard(
          'memos',
          t('mypage.memosMenu'),
          <IconSymbol name="note.text" size={moderateScale(20)} color="#b45309" />,
          () => router.push('/(tabs)/mypage/memos'),
        )}

        {renderMenuCard(
          'prayers',
          t('mypage.prayersMenu'),
          <IconSymbol name="hands.sparkles" size={moderateScale(20)} color="#6366f1" />,
          () => router.push('/(tabs)/mypage/prayers'),
        )}

        {renderMenuCard(
          'plans',
          t('mypage.plansMenu'),
          <IconSymbol name="book.fill" size={moderateScale(20)} color="#059669" />,
          () => router.push('/(tabs)/mypage/plans'),
        )}

        {renderMenuCard(
          'churches',
          t('church.title'),
          <MaterialIcons name="groups" size={moderateScale(20)} color="#2563eb" />,
          () => router.push('/churches' as never),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
