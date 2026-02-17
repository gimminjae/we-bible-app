import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button, ButtonText } from '@/components/ui/button';
import { useI18n } from '@/utils/i18n';
import { getAllPlans, type PlanListItem } from '@/utils/plan-db';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useResponsive } from '@/hooks/use-responsive';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(raw: string): string {
  if (!raw) return '-';
  const [date] = raw.split(' ');
  const [y = '', m = '', d = ''] = date.split('-');
  return `${y}.${m}.${d}`;
}

function getGoalSummary(selectedBookCodes: string[], t: (key: string) => string): string {
  if (selectedBookCodes.length === 0) return '-';
  const otCount = selectedBookCodes.filter((c) => {
    const otBooks = [
      'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
      'joshua', 'judges', 'ruth', '1samuel', '2samuel', '1kings', '2kings',
      '1chronicles', '2chronicles', 'ezra', 'nehemiah', 'esther', 'job',
      'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon', 'isaiah',
      'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel',
      'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
      'zephaniah', 'haggai', 'zechariah', 'malachi',
    ];
    return otBooks.includes(c);
  }).length;
  const ntCount = selectedBookCodes.length - otCount;
  const parts: string[] = [];
  if (otCount > 0) parts.push(`${t('bibleDrawer.oldTestament')} ${otCount}권`);
  if (ntCount > 0) parts.push(`${t('bibleDrawer.newTestament')} ${ntCount}권`);
  return parts.join(' · ') || '-';
}

export default function PlanListScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { scale, moderateScale } = useResponsive();
  const [items, setItems] = useState<PlanListItem[]>([]);

  const load = useCallback(() => {
    let active = true;
    getAllPlans(db).then((rows) => {
      if (!active) return;
      setItems(rows);
    });
    return () => {
      active = false;
    };
  }, [db]);

  useFocusEffect(load);

  const handleAddPress = useCallback(() => {
    router.push('/(tabs)/mypage/plan/add');
  }, [router]);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View
        className="flex-row items-center justify-between"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(12),
        }}
      >
        <View className="flex-row items-center" style={{ gap: scale(12) }}>
          <IconSymbol
            name="chevron.right"
            size={moderateScale(18)}
            color="#9ca3af"
            style={{ transform: [{ rotate: '180deg' }] }}
          />
          <Text onPress={() => router.back()} className="text-gray-700 dark:text-gray-300" style={{ fontSize: moderateScale(16) }}>
            {t('common.back')}
          </Text>
          <Text className="font-bold text-gray-900 dark:text-white" style={{ fontSize: moderateScale(18), marginLeft: scale(8) }}>
            {t('mypage.plansTitle')}
          </Text>
        </View>
        <Button onPress={handleAddPress} action="primary" size="sm">
          <ButtonText>{t('mypage.addPlan')}</ButtonText>
        </Button>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingBottom: scale(24),
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View className="flex-1 justify-center" style={{ paddingVertical: scale(64) }}>
            <Text className="text-gray-500 dark:text-gray-400 text-center" style={{ fontSize: moderateScale(16) }}>
              {t('mypage.emptyPlans')}
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/mypage/plan/[id]',
                  params: { id: String(item.id) },
                })
              }
              className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 active:opacity-90"
              style={{ marginBottom: scale(12), paddingHorizontal: scale(16), paddingVertical: scale(20) }}
            >
              <View className="flex-row items-center justify-between" style={{ marginBottom: scale(8) }}>
                <Text className="font-semibold text-gray-900 dark:text-white flex-1" style={{ fontSize: moderateScale(16) }}>
                  {item.planName || t('mypage.planDetailTitle')}
                </Text>
                <View className="bg-primary-100 dark:bg-primary-900/40 rounded-lg" style={{ paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
                  <Text className="font-bold text-primary-600 dark:text-primary-400" style={{ fontSize: moderateScale(14) }}>
                    {item.goalPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text className="text-gray-600 dark:text-gray-400" style={{ fontSize: moderateScale(14), marginBottom: scale(12) }}>
                {getGoalSummary(item.selectedBookCodes, t)}
              </Text>
              <View className="flex-row items-center" style={{ gap: scale(8) }}>
                <IconSymbol name="calendar" size={moderateScale(14)} color="#9ca3af" />
                <Text className="text-gray-500 dark:text-gray-400" style={{ fontSize: moderateScale(14) }}>
                  {t('mypage.planStartDate')} {formatDate(item.startDate)} ~ {t('mypage.planEndDate')}{' '}
                  {formatDate(item.endDate)}
                </Text>
              </View>
              <View className="flex-row items-center" style={{ gap: scale(4), marginTop: scale(8) }}>
                <Text className="text-primary-600 dark:text-primary-400 font-medium" style={{ fontSize: moderateScale(12) }}>
                  {item.restDay}
                </Text>
                <Text className="text-gray-500 dark:text-gray-400" style={{ fontSize: moderateScale(12) }}>
                  {t('mypage.planDaysRemaining')}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
