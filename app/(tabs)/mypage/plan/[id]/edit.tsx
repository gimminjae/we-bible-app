import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button, ButtonText } from '@/components/ui/button';
import { useAppSettings } from '@/contexts/app-settings';
import { getBookName } from '@/services/bible';
import { useToast } from '@/contexts/toast-context';
import {
  getPlanById,
  updatePlanInfo,
  BIBLE_BOOKS,
  calcTotalReadCount,
} from '@/utils/plan-db';
import { useI18n } from '@/utils/i18n';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OT_BOOKS = BIBLE_BOOKS.filter((b) => b.bookSeq <= 39);
const NT_BOOKS = BIBLE_BOOKS.filter((b) => b.bookSeq >= 40);

export default function EditPlanScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useI18n();
  const { appLanguage } = useAppSettings();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const planId = useMemo(() => Number(params.id || 0), [params.id]);
  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBookCodes, setSelectedBookCodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'ot' | 'nt'>('ot');

  const totalChapters = useMemo(
    () => calcTotalReadCount(Array.from(selectedBookCodes)),
    [selectedBookCodes]
  );

  useEffect(() => {
    let active = true;
    if (!planId) return;
    getPlanById(db, planId).then((row) => {
      if (!active || !row) return;
      setPlanName(row.planName);
      setStartDate(row.startDate);
      setEndDate(row.endDate);
      setSelectedBookCodes(new Set(row.selectedBookCodes));
    });
    return () => {
      active = false;
    };
  }, [db, planId]);

  const toggleBook = useCallback((code: string) => {
    setSelectedBookCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const selectAllOt = useCallback(() => {
    setSelectedBookCodes((prev) => {
      const next = new Set(prev);
      const allSelected = OT_BOOKS.every((b) => next.has(b.bookCode));
      if (allSelected) {
        OT_BOOKS.forEach((b) => next.delete(b.bookCode));
      } else {
        OT_BOOKS.forEach((b) => next.add(b.bookCode));
      }
      return next;
    });
  }, []);

  const selectAllNt = useCallback(() => {
    setSelectedBookCodes((prev) => {
      const next = new Set(prev);
      const allSelected = NT_BOOKS.every((b) => next.has(b.bookCode));
      if (allSelected) {
        NT_BOOKS.forEach((b) => next.delete(b.bookCode));
      } else {
        NT_BOOKS.forEach((b) => next.add(b.bookCode));
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const codes = Array.from(selectedBookCodes);
    if (codes.length === 0) return;
    if (!endDate.trim()) return;
    const name = planName.trim() || t('mypage.planDetailTitle');
    await updatePlanInfo(db, planId, name, startDate, endDate, codes);
    showToast(t('toast.planUpdated'), '📖');
    router.back();
  }, [db, planId, planName, startDate, endDate, selectedBookCodes, router, showToast, t]);

  const canSave = selectedBookCodes.size > 0 && endDate.trim().length > 0;
  const booksToShow = activeTab === 'ot' ? OT_BOOKS : NT_BOOKS;

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <IconSymbol
            name="chevron.right"
            size={18}
            color="#9ca3af"
            style={{ transform: [{ rotate: '180deg' }] }}
          />
          <Text onPress={() => router.back()} className="text-base text-gray-700 dark:text-gray-300">
            {t('common.back')}
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">
            {t('planDrawer.editTitle')}
          </Text>
        </View>
        <Button onPress={handleSave} disabled={!canSave} action="primary" size="sm">
          <ButtonText>{t('planDrawer.save')}</ButtonText>
        </Button>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
          {t('planDrawer.planNameLabel')}
        </Text>
        <TextInput
          value={planName}
          onChangeText={setPlanName}
          placeholder={t('planDrawer.planNamePlaceholder')}
          placeholderTextColor="#9ca3af"
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base mb-4"
        />

        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
          {t('planDrawer.startDateLabel')}
        </Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base mb-4"
        />

        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
          {t('planDrawer.endDateLabel')}
        </Text>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base mb-4"
        />

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('planDrawer.selectBooksLabel')} ({selectedBookCodes.size}권, 총 {totalChapters}장)
          </Text>
          <View className="flex-row gap-2">
            <Button
              onPress={() => setActiveTab('ot')}
              action={activeTab === 'ot' ? 'primary' : 'secondary'}
              size="sm"
            >
              <ButtonText>{t('bibleDrawer.oldTestament')}</ButtonText>
            </Button>
            <Button
              onPress={() => setActiveTab('nt')}
              action={activeTab === 'nt' ? 'primary' : 'secondary'}
              size="sm"
            >
              <ButtonText>{t('bibleDrawer.newTestament')}</ButtonText>
            </Button>
          </View>
        </View>

        <View className="mb-2">
          <Button
            onPress={activeTab === 'ot' ? selectAllOt : selectAllNt}
            action="default"
            variant="outline"
            size="sm"
            className="self-start"
          >
            <ButtonText>
              {activeTab === 'ot' ? `${t('bibleDrawer.oldTestament')} 전체선택` : `${t('bibleDrawer.newTestament')} 전체선택`}
            </ButtonText>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {booksToShow.map((book) => {
            const isSelected = selectedBookCodes.has(book.bookCode);
            return (
              <Button
                key={book.bookCode}
                onPress={() => toggleBook(book.bookCode)}
                action={isSelected ? 'primary' : 'secondary'}
                size="sm"
                variant="outline"
                className="rounded-lg"
              >
                <ButtonText>
                  {getBookName(book.bookCode, appLanguage)} ({book.maxChapter})
                </ButtonText>
              </Button>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
