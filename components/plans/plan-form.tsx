import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { Button, ButtonText } from '@/components/ui/button';
import { useAppSettings } from '@/contexts/app-settings';
import { useResponsive } from '@/hooks/use-responsive';
import { BIBLE_BOOKS, calcTotalReadCount, createDefaultPlanDates } from '@/lib/plan';
import { getBookName } from '@/services/bible';
import {
  BIBLE_CATEGORY_KEYS,
  CATEGORY_BOOK_CODES,
  type BibleCategoryKey,
} from '@/utils/bible-categories';
import { useI18n } from '@/utils/i18n';

type PlanFormValues = {
  planName: string;
  planDescription: string;
  startDate: string;
  endDate: string;
  selectedBookCodes: string[];
};

type PlanFormInitialValues = Partial<PlanFormValues>;

type PlanFormProps = {
  initialValues?: PlanFormInitialValues;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: PlanFormValues) => void | Promise<void>;
};

export function PlanForm({
  initialValues,
  submitLabel,
  isSubmitting = false,
  onSubmit,
}: PlanFormProps) {
  const { appLanguage } = useAppSettings();
  const { t } = useI18n();
  const { dialogMaxWidth } = useResponsive();
  const defaultDates = useMemo(() => createDefaultPlanDates(), []);
  const initialSelectedBookCodesKey = useMemo(
    () => (initialValues?.selectedBookCodes ?? []).join(','),
    [initialValues?.selectedBookCodes],
  );
  const initialSelectedBookCodes = useMemo(
    () => (initialSelectedBookCodesKey ? initialSelectedBookCodesKey.split(',') : []),
    [initialSelectedBookCodesKey],
  );
  const [planName, setPlanName] = useState(initialValues?.planName ?? '');
  const [planDescription, setPlanDescription] = useState(initialValues?.planDescription ?? '');
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? defaultDates.startDate);
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? defaultDates.endDate);
  const [selectedBookCodes, setSelectedBookCodes] = useState<Set<string>>(
    new Set(initialValues?.selectedBookCodes ?? []),
  );
  const [category, setCategory] = useState<BibleCategoryKey>('ot');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateField, setDateField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    setPlanName(initialValues?.planName ?? '');
    setPlanDescription(initialValues?.planDescription ?? '');
    setStartDate(initialValues?.startDate ?? defaultDates.startDate);
    setEndDate(initialValues?.endDate ?? defaultDates.endDate);
    setSelectedBookCodes(new Set(initialSelectedBookCodes));
  }, [
    defaultDates.endDate,
    defaultDates.startDate,
    initialSelectedBookCodes,
    initialSelectedBookCodesKey,
    initialValues?.endDate,
    initialValues?.planDescription,
    initialValues?.planName,
    initialValues?.startDate,
  ]);

  const booksToShow = useMemo(() => {
    const allowedCodes = new Set(CATEGORY_BOOK_CODES[category]);
    return BIBLE_BOOKS.filter((book) => allowedCodes.has(book.bookCode));
  }, [category]);

  const selectedCodes = useMemo(() => [...selectedBookCodes], [selectedBookCodes]);
  const totalChapters = useMemo(() => calcTotalReadCount(selectedCodes), [selectedCodes]);
  const isDateRangeInvalid = endDate.trim().length > 0 && endDate <= startDate;
  const canSubmit = selectedBookCodes.size > 0 && endDate.trim().length > 0 && !isDateRangeInvalid;

  const toggleBook = (bookCode: string) => {
    setSelectedBookCodes((previous) => {
      const next = new Set(previous);
      if (next.has(bookCode)) next.delete(bookCode);
      else next.add(bookCode);
      return next;
    });
  };

  const toggleSelectAllByCategory = () => {
    setSelectedBookCodes((previous) => {
      const next = new Set(previous);
      const allSelected = booksToShow.every((book) => next.has(book.bookCode));
      if (allSelected) booksToShow.forEach((book) => next.delete(book.bookCode));
      else booksToShow.forEach((book) => next.add(book.bookCode));
      return next;
    });
  };

  const selectedDay = dateField === 'start' ? startDate : endDate;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('planDrawer.planNameLabel')}
        </Text>
        <TextInput
          value={planName}
          onChangeText={setPlanName}
          placeholder={t('planDrawer.planNamePlaceholder')}
          placeholderTextColor="#9ca3af"
          className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />

        <Text className="mb-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('planDrawer.planDescriptionLabel')}
        </Text>
        <TextInput
          value={planDescription}
          onChangeText={setPlanDescription}
          placeholder={t('planDrawer.planDescriptionPlaceholder')}
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          className="mb-4 min-h-[112px] rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />

        <Text className="mb-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('planDrawer.startDateLabel')}
        </Text>
        <Button
          onPress={() => {
            setDateField('start');
            setCalendarOpen(true);
          }}
          action="secondary"
          variant="outline"
          className="mb-4 h-auto justify-start rounded-2xl border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <ButtonText className="text-base font-normal text-gray-900 dark:text-white">{startDate}</ButtonText>
        </Button>

        <Text className="mb-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('planDrawer.endDateLabel')}
        </Text>
        <Button
          onPress={() => {
            setDateField('end');
            setCalendarOpen(true);
          }}
          action="secondary"
          variant="outline"
          className="mb-2 h-auto justify-start rounded-2xl border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <ButtonText
            className={`text-base font-normal ${endDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
          >
            {endDate || 'YYYY-MM-DD'}
          </ButtonText>
        </Button>

        {isDateRangeInvalid ? (
          <Text className="mb-3 text-xs text-red-500">{t('planDrawer.invalidDateRange')}</Text>
        ) : (
          <View className="mb-3" />
        )}

        <Text className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('planDrawer.selectBooksLabel')} ({selectedBookCodes.size} / {totalChapters})
        </Text>

        <View className="mb-2 flex-row flex-wrap items-center gap-2">
          {BIBLE_CATEGORY_KEYS.map((categoryKey) => {
            const selected = category === categoryKey;
            const label =
              categoryKey === 'ot'
                ? t('bibleDrawer.oldTestament')
                : categoryKey === 'nt'
                  ? t('bibleDrawer.newTestament')
                  : t(`bibleDrawer.category.${categoryKey}`);
            return (
              <Button
                key={categoryKey}
                onPress={() => setCategory(categoryKey)}
                action={selected ? 'primary' : 'secondary'}
                size="sm"
                className={`rounded-2xl ${
                  selected ? 'bg-primary-500' : 'border-0 bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <ButtonText
                  className={`text-sm font-semibold ${
                    selected ? 'text-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </ButtonText>
              </Button>
            );
          })}
        </View>

        <View className="mb-4">
          <Button
            onPress={toggleSelectAllByCategory}
            action="secondary"
            variant="outline"
            className="h-auto self-start rounded-2xl border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <ButtonText className="text-sm font-medium text-gray-900 dark:text-white">
              {t('planDrawer.selectAll')}
            </ButtonText>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {booksToShow.map((book) => {
            const selected = selectedBookCodes.has(book.bookCode);
            return (
              <Button
                key={book.bookCode}
                onPress={() => toggleBook(book.bookCode)}
                action={selected ? 'primary' : 'secondary'}
                variant="outline"
                size="sm"
                className="rounded-2xl"
              >
                <ButtonText>
                  {getBookName(book.bookCode, appLanguage)} ({book.maxChapter})
                </ButtonText>
              </Button>
            );
          })}
        </View>

        <Button
          disabled={!canSubmit || isSubmitting}
          onPress={() =>
            void onSubmit({
              planName: planName.trim() || t('mypage.planDetailTitle'),
              planDescription: planDescription.trim(),
              startDate,
              endDate,
              selectedBookCodes: [...selectedBookCodes],
            })
          }
          className={`mt-6 h-auto rounded-2xl px-4 py-4 ${
            !canSubmit || isSubmitting ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary-500'
          }`}
        >
          <ButtonText className="font-semibold text-white">{submitLabel}</ButtonText>
        </Button>
      </ScrollView>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable className="flex-1 justify-center bg-black/40 px-5" onPress={() => setCalendarOpen(false)}>
          <Pressable
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            style={{ width: '100%', maxWidth: dialogMaxWidth, alignSelf: 'center' }}
            onPress={(event) => event.stopPropagation()}
          >
            <View className="px-4 pb-2 pt-4">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {dateField === 'start' ? t('planDrawer.startDateLabel') : t('planDrawer.endDateLabel')}
              </Text>
            </View>
            <Calendar
              current={selectedDay || startDate}
              onDayPress={({ dateString }) => {
                if (dateField === 'start') setStartDate(dateString);
                else setEndDate(dateString);
                setCalendarOpen(false);
              }}
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
    </View>
  );
}
