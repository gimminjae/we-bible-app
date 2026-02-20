import { Button, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppSettings } from '@/contexts/app-settings';
import { useToast } from '@/contexts/toast-context';
import { getBookName } from '@/services/bible';
import { useI18n } from '@/utils/i18n';
import {
  BIBLE_CATEGORY_KEYS,
  CATEGORY_BOOK_CODES,
  type BibleCategoryKey,
} from '@/utils/bible-categories';
import {
  BIBLE_BOOKS,
  calcTotalReadCount,
  getPlanById,
  updatePlanInfo,
} from '@/utils/plan-db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [category, setCategory] = useState<BibleCategoryKey>('ot');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateField, setDateField] = useState<'start' | 'end'>('start');

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

  const booksToShow = useMemo(() => {
    const allowedCodes = new Set(CATEGORY_BOOK_CODES[category]);
    return BIBLE_BOOKS.filter((b) => allowedCodes.has(b.bookCode));
  }, [category]);

  const toggleSelectAllByCategory = useCallback(() => {
    setSelectedBookCodes((prev) => {
      const next = new Set(prev);
      const allSelected = booksToShow.every((b) => next.has(b.bookCode));
      if (allSelected) {
        booksToShow.forEach((b) => next.delete(b.bookCode));
      } else {
        booksToShow.forEach((b) => next.add(b.bookCode));
      }
      return next;
    });
  }, [booksToShow]);

  const handleSave = useCallback(async () => {
    const codes = Array.from(selectedBookCodes);
    if (codes.length === 0) return;
    if (!endDate.trim()) return;
    if (endDate <= startDate) return;
    const name = planName.trim() || t('mypage.planDetailTitle');
    await updatePlanInfo(db, planId, name, startDate, endDate, codes);
    showToast(t('toast.planUpdated'), '📖');
    router.back();
  }, [db, planId, planName, startDate, endDate, selectedBookCodes, router, showToast, t]);

  const isDateRangeInvalid = endDate.trim().length > 0 && endDate <= startDate;
  const canSave = selectedBookCodes.size > 0 && endDate.trim().length > 0 && !isDateRangeInvalid;
  const selectedDay = dateField === 'start' ? startDate : endDate;
  const categoryLabel =
    category === 'ot'
      ? t('bibleDrawer.oldTestament')
      : category === 'nt'
        ? t('bibleDrawer.newTestament')
        : t(`bibleDrawer.category.${category}`);

  const handleOpenCalendar = useCallback((field: 'start' | 'end') => {
    setDateField(field);
    setCalendarOpen(true);
  }, []);

  const handleSelectDay = useCallback(({ dateString }: { dateString: string }) => {
    if (dateField === 'start') setStartDate(dateString);
    else setEndDate(dateString);
    setCalendarOpen(false);
  }, [dateField]);

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
        <Pressable
          onPress={() => handleOpenCalendar('start')}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3 mb-4"
        >
          <Text className="text-gray-900 dark:text-white text-base">{startDate}</Text>
        </Pressable>

        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
          {t('planDrawer.endDateLabel')}
        </Text>
        <Pressable
          onPress={() => handleOpenCalendar('end')}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3 mb-2"
        >
          <Text className={`text-base ${endDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
            {endDate || 'YYYY-MM-DD'}
          </Text>
        </Pressable>
        {isDateRangeInvalid ? (
          <Text className="text-red-500 text-xs mb-3">{t('planDrawer.invalidDateRange')}</Text>
        ) : (
          <View className="mb-3" />
        )}

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('planDrawer.selectBooksLabel')} ({selectedBookCodes.size}권, 총 {totalChapters}장)
          </Text>
        </View>
        <View className="flex-row flex-wrap items-center gap-2 mb-2">
          {BIBLE_CATEGORY_KEYS.map((categoryKey) => {
            const selected = category === categoryKey;
            const label =
              categoryKey === 'ot'
                ? t('bibleDrawer.oldTestament')
                : categoryKey === 'nt'
                  ? t('bibleDrawer.newTestament')
                  : t(`bibleDrawer.category.${categoryKey}`);
            return (
              <Pressable
                key={categoryKey}
                onPress={() => setCategory(categoryKey)}
                className={`px-3.5 py-2 rounded-xl ${selected ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'}`}
              >
                <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mb-2">
          <Pressable
            onPress={toggleSelectAllByCategory}
            className="self-start rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
          >
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {`${categoryLabel} ${t('planDrawer.selectAll')}`}
            </Text>
          </Pressable>
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

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center px-5"
          onPress={() => setCalendarOpen(false)}
        >
          <Pressable
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={{ width: '100%', maxWidth: 380, maxHeight: '90%', alignSelf: 'center' }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-4 pt-4 pb-2">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {dateField === 'start' ? t('planDrawer.startDateLabel') : t('planDrawer.endDateLabel')}
              </Text>
            </View>
            <Calendar
              style={{ alignSelf: 'stretch' }}
              current={selectedDay || startDate}
              onDayPress={handleSelectDay}
              markedDates={{
                ...(startDate ? { [startDate]: { selected: true } } : {}),
                ...(endDate ? { [endDate]: { selected: true } } : {}),
              }}
              theme={{
                selectedDayBackgroundColor: '#3b82f6',
                todayTextColor: '#2563eb',
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
