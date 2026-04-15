import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppSettings } from '@/contexts/app-settings';
import { useResponsive } from '@/hooks/use-responsive';
import { BIBLE_BOOKS } from '@/lib/plan';
import bibleService, { getBookName } from '@/services/bible';
import {
  BIBLE_CATEGORY_KEYS,
  CATEGORY_BOOK_CODES,
  type BibleCategoryKey,
} from '@/utils/bible-categories';
import { useI18n } from '@/utils/i18n';
import {
  formatThemeVerseNumbers,
  type ThemeVerseRecord,
} from '@/utils/theme-verse-db';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type ThemeVerseSheetProps = {
  visible: boolean;
  year: number;
  initialValue: ThemeVerseRecord | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: {
    year: number;
    bookCode: string;
    chapter: number;
    verseNumbers: number[];
    verseText: string;
    description: string;
  }) => Promise<void> | void;
};

type PickerStep = 'form' | 'book' | 'chapter';
type ChapterVerse = { verse: number; content: string };

function replaceToken(template: string, token: string, value: string) {
  return template.replace(`{${token}}`, value);
}

function resolveCategoryFromBookCode(bookCode: string): BibleCategoryKey {
  if (!bookCode) return 'ot';
  return BIBLE_CATEGORY_KEYS.find((key) => CATEGORY_BOOK_CODES[key].includes(bookCode)) ?? 'ot';
}

function sanitizeVerseNumbersInput(value: string): string {
  return value.replace(/[^0-9,\-\s~]/g, '');
}

function parseVerseNumbersInput(raw: string): number[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const segments = trimmed
    .replace(/~/g, '-')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const values: number[] = [];

  for (const segment of segments) {
    if (segment.includes('-')) {
      const parts = segment.split('-').map((part) => part.trim()).filter(Boolean);
      if (parts.length !== 2) return null;

      const start = Number(parts[0]);
      const end = Number(parts[1]);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) {
        return null;
      }

      const rangeStart = Math.min(start, end);
      const rangeEnd = Math.max(start, end);
      for (let current = rangeStart; current <= rangeEnd; current += 1) {
        values.push(current);
      }
      continue;
    }

    const value = Number(segment);
    if (!Number.isInteger(value) || value <= 0) return null;
    values.push(value);
  }

  return [...new Set(values)].sort((left, right) => left - right);
}

export function ThemeVerseSheet({
  visible,
  year,
  initialValue,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ThemeVerseSheetProps) {
  const { t } = useI18n();
  const { appLanguage } = useAppSettings();
  const { scale, moderateScale, width, sheetMaxWidth, isTablet, getAdaptiveColumns } = useResponsive();

  const [pickerStep, setPickerStep] = useState<PickerStep>('form');
  const [category, setCategory] = useState<BibleCategoryKey>('ot');
  const [bookCode, setBookCode] = useState('');
  const [chapter, setChapter] = useState(1);
  const [verseNumbersInput, setVerseNumbersInput] = useState('');
  const [description, setDescription] = useState('');
  const [chapterVerses, setChapterVerses] = useState<ChapterVerse[]>([]);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [chapterLoadFailed, setChapterLoadFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPickerStep('form');
    setErrorMessage('');
    setBookCode(initialValue?.bookCode ?? '');
    setChapter(initialValue?.chapter ?? 1);
    setVerseNumbersInput(
      initialValue
        ? formatThemeVerseNumbers(initialValue.verseNumbers)
        : '',
    );
    setDescription(initialValue?.description ?? '');
    setCategory(resolveCategoryFromBookCode(initialValue?.bookCode ?? ''));
  }, [initialValue, visible]);

  useEffect(() => {
    if (!visible || !bookCode || chapter <= 0) {
      setChapterVerses([]);
      setChapterLoadFailed(false);
      return;
    }

    let active = true;
    setIsLoadingChapter(true);
    setChapterLoadFailed(false);

    bibleService
      .getBible({
        bookCode,
        chapter,
        lang: appLanguage,
      })
      .then((rows) => {
        if (!active) return;
        const normalized = Array.isArray(rows)
          ? rows.map((row: { verse?: number | string; content?: string }, index: number) => ({
              verse:
                typeof row.verse === 'number'
                  ? row.verse
                  : Number(row.verse) || index + 1,
              content: row.content ?? '',
            }))
          : [];
        setChapterVerses(normalized);
      })
      .catch(() => {
        if (!active) return;
        setChapterVerses([]);
        setChapterLoadFailed(true);
      })
      .finally(() => {
        if (active) setIsLoadingChapter(false);
      });

    return () => {
      active = false;
    };
  }, [appLanguage, bookCode, chapter, visible]);

  const selectedBook = useMemo(
    () => BIBLE_BOOKS.find((item) => item.bookCode === bookCode) ?? null,
    [bookCode],
  );

  const filteredBooks = useMemo(() => {
    const allowed = new Set(CATEGORY_BOOK_CODES[category]);
    return BIBLE_BOOKS.filter((item) => allowed.has(item.bookCode));
  }, [category]);

  const selectedVerseNumbers = useMemo(
    () => parseVerseNumbersInput(verseNumbersInput),
    [verseNumbersInput],
  );

  const selectedVersePreview = useMemo(() => {
    if (!selectedVerseNumbers?.length) return '';

    const selectedVerses = selectedVerseNumbers.map((verseNumber) =>
      chapterVerses.find((item) => item.verse === verseNumber),
    );

    if (selectedVerses.some((item) => !item)) {
      return null;
    }

    return selectedVerses
      .map((item) => `${item!.verse}. ${item!.content}`)
      .join('\n\n');
  }, [chapterVerses, selectedVerseNumbers]);

  const chapterGridColumns = useMemo(() => {
    const availableWidth = Math.min(width, sheetMaxWidth) - scale(40);
    return getAdaptiveColumns(isTablet ? 72 : 60, scale(8), isTablet ? 8 : 5, availableWidth);
  }, [getAdaptiveColumns, isTablet, scale, sheetMaxWidth, width]);

  const handleSelectBook = (nextBookCode: string) => {
    setBookCode(nextBookCode);
    setChapter(1);
    setVerseNumbersInput('');
    setErrorMessage('');
    setPickerStep('chapter');
  };

  const handleSelectChapter = (nextChapter: number) => {
    setChapter(nextChapter);
    setVerseNumbersInput('');
    setErrorMessage('');
    setPickerStep('form');
  };

  const handleSubmit = async () => {
    if (!bookCode) {
      setErrorMessage(t('themeVerse.requiredBookChapter'));
      return;
    }

    if (!verseNumbersInput.trim()) {
      setErrorMessage(t('themeVerse.requiredVerse'));
      return;
    }

    if (!selectedVerseNumbers || selectedVerseNumbers.length === 0) {
      setErrorMessage(t('themeVerse.invalidVerse'));
      return;
    }

    if (chapterLoadFailed) {
      setErrorMessage(t('themeVerse.loadVerseFailed'));
      return;
    }

    if (!selectedVersePreview) {
      setErrorMessage(t('themeVerse.invalidVerse'));
      return;
    }

    setErrorMessage('');
    await onSubmit({
      year,
      bookCode,
      chapter,
      verseNumbers: selectedVerseNumbers,
      verseText: selectedVersePreview,
      description: description.trim(),
    });
  };

  const sheetTitle =
    pickerStep === 'book'
      ? t('themeVerse.selectBookTitle')
      : pickerStep === 'chapter'
        ? t('themeVerse.selectChapterTitle')
        : replaceToken(
            initialValue ? t('themeVerse.drawerEditTitle') : t('themeVerse.drawerCreateTitle'),
            'year',
            String(year),
          );

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.85}>
      <View className="flex-1">
        <View
          className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800"
          style={{
            paddingHorizontal: scale(20),
            paddingTop: scale(16),
            paddingBottom: scale(14),
          }}
        >
          <View className="flex-row items-center" style={{ gap: scale(8) }}>
            {pickerStep !== 'form' ? (
              <Pressable
                onPress={() => setPickerStep(pickerStep === 'chapter' ? 'book' : 'form')}
                className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <IconSymbol
                  name="chevron.right"
                  size={moderateScale(18)}
                  color="#9ca3af"
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Pressable>
            ) : null}
            <Text
              className="font-semibold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(18) }}
            >
              {sheetTitle}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text
              className="text-gray-500 dark:text-gray-400"
              style={{ fontSize: moderateScale(18) }}
            >
              ✕
            </Text>
          </Pressable>
        </View>

        {pickerStep === 'form' ? (
          <View style={{ flex: 1 }}>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: scale(20),
                paddingTop: scale(18),
                paddingBottom: scale(24),
              }}
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text
                className="text-sm text-gray-500 dark:text-gray-400"
                style={{ fontSize: moderateScale(14), lineHeight: moderateScale(22) }}
              >
                {t('themeVerse.drawerGuide')}
              </Text>

              <View style={{ marginTop: scale(20) }}>
                <Text
                  className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {t('themeVerse.selectBookChapter')}
                </Text>
                <Button
                  onPress={() => {
                    setCategory(resolveCategoryFromBookCode(bookCode));
                    setPickerStep('book');
                  }}
                  action="secondary"
                  variant="outline"
                  className="h-auto justify-between rounded-2xl border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  <ButtonText className="font-medium text-gray-900 dark:text-white">
                    {selectedBook
                      ? replaceToken(
                          replaceToken(
                            t('themeVerse.selectedBookChapter'),
                            'book',
                            getBookName(selectedBook.bookCode, appLanguage),
                          ),
                          'chapter',
                          String(chapter),
                        )
                      : t('themeVerse.selectBookChapterPlaceholder')}
                  </ButtonText>
                  <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" />
                </Button>
              </View>

              <View style={{ marginTop: scale(20) }}>
                <Text
                  className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {t('themeVerse.verseNumberLabel')}
                </Text>
                <TextInput
                  value={verseNumbersInput}
                  onChangeText={(value) => {
                    setVerseNumbersInput(sanitizeVerseNumbersInput(value));
                    setErrorMessage('');
                  }}
                  placeholder={t('themeVerse.verseNumberPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
                {selectedVerseNumbers && selectedVerseNumbers.length > 0 ? (
                  <Text
                    className="mt-2 text-sm text-gray-500 dark:text-gray-400"
                    style={{ fontSize: moderateScale(13) }}
                  >
                    {formatThemeVerseNumbers(selectedVerseNumbers)}
                  </Text>
                ) : null}
              </View>

              <View style={{ marginTop: scale(20) }}>
                <Text
                  className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {t('themeVerse.versePreviewLabel')}
                </Text>
                <View className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
                  <Text
                    className="text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(16), lineHeight: moderateScale(26) }}
                  >
                    {isLoadingChapter
                      ? '...'
                      : selectedVersePreview || t('themeVerse.versePreviewEmpty')}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: scale(20) }}>
                <Text
                  className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {t('themeVerse.descriptionLabel')}
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('themeVerse.descriptionPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlignVertical="top"
                  className="min-h-32 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </View>

              {errorMessage ? (
                <Text
                  className="mt-4 text-sm text-red-500"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {errorMessage}
                </Text>
              ) : null}
            </ScrollView>

            <View
              className="flex-row gap-3 border-t border-gray-200 px-6 pb-5 pt-3 dark:border-gray-800"
            >
              <Button
                onPress={onClose}
                disabled={isSubmitting}
                action="secondary"
                variant="outline"
                className="h-auto flex-1 rounded-2xl border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <ButtonText className="font-semibold text-gray-900 dark:text-white">
                  {t('common.cancel')}
                </ButtonText>
              </Button>
              <Button
                onPress={() => void handleSubmit()}
                disabled={isSubmitting}
                className="h-auto flex-1 rounded-2xl bg-primary-500 px-4 py-4"
              >
                <ButtonText className="font-semibold text-white">
                  {t('themeVerse.save')}
                </ButtonText>
              </Button>
            </View>
          </View>
        ) : pickerStep === 'book' ? (
          <View style={{ flex: 1 }}>
            <View
              className="flex-row flex-wrap items-center"
              style={{
                paddingHorizontal: scale(20),
                paddingTop: scale(16),
                gap: scale(8),
              }}
            >
              {BIBLE_CATEGORY_KEYS.map((categoryKey) => {
                const selected = category === categoryKey;
                return (
                  <Button
                    key={categoryKey}
                    onPress={() => setCategory(categoryKey)}
                    size="sm"
                    action={selected ? 'primary' : 'secondary'}
                    className="rounded-xl"
                  >
                    <ButtonText>
                      {categoryKey === 'ot'
                        ? t('bibleDrawer.oldTestament')
                        : categoryKey === 'nt'
                          ? t('bibleDrawer.newTestament')
                          : t(`bibleDrawer.category.${categoryKey}`)}
                    </ButtonText>
                  </Button>
                );
              })}
            </View>

            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: scale(20),
                paddingVertical: scale(16),
              }}
              showsVerticalScrollIndicator={false}
            >
              {filteredBooks.map((item) => (
                <Pressable
                  key={item.bookCode}
                  onPress={() => handleSelectBook(item.bookCode)}
                  className="rounded-2xl px-4 py-4 active:bg-gray-100 dark:active:bg-gray-800"
                >
                  <Text
                    className="text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(16) }}
                  >
                    {getBookName(item.bookCode, appLanguage)} ({item.maxChapter})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: scale(20),
              paddingTop: scale(16),
              paddingBottom: scale(24),
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              className="mb-4 text-sm text-gray-500 dark:text-gray-400"
              style={{ fontSize: moderateScale(14) }}
            >
              {selectedBook ? getBookName(selectedBook.bookCode, appLanguage) : ''}
            </Text>
            <View className="flex-row flex-wrap">
              {Array.from({ length: selectedBook?.maxChapter ?? 0 }, (_, index) => index + 1).map(
                (value) => (
                  <View
                    key={value}
                    style={{ padding: scale(4), width: `${100 / chapterGridColumns}%` }}
                  >
                    <Pressable
                      onPress={() => handleSelectChapter(value)}
                      className="items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-4 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <Text
                        className="text-gray-900 dark:text-white"
                        style={{ fontSize: moderateScale(15) }}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  </View>
                ),
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </BottomSheet>
  );
}
