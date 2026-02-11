import { useBibleQuery } from '@/hooks/use-bible-query';
import { bibleInfos, getBookName, versions } from '@/services/bible';
import { makeCopyBibles } from '@/utils/bible.util';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { BibleLang } from './types';

async function copyTextToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  await Clipboard.setStringAsync(text);
}

const BOOKS = bibleInfos.filter((b) => b.bookSeq > 0);
const LANG_OPTIONS = versions;
const FONT_STEPS = [0.8, 0.9, 1, 1.1, 1.2] as const;

export function useBibleReader() {
  const [bookCode, setBookCode] = useState('genesis');
  const [chapter, setChapter] = useState(1);
  const [primaryLang, setPrimaryLang] = useState<BibleLang>('ko');
  const [secondaryLang, setSecondaryLang] = useState<BibleLang>('en');
  const [dualLang, setDualLang] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  const [showBookDrawer, setShowBookDrawer] = useState(false);
  const [pickerStep, setPickerStep] = useState<'book' | 'chapter'>('book');
  const [showLangDrawer, setShowLangDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showSecondarySelector, setShowSecondarySelector] = useState(false);
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);

  const { data: verses = [], isLoading: loading, error: queryError } = useBibleQuery({
    bookCode,
    chapter,
    primaryLang,
    dualLang,
    secondaryLang,
  });

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load') : null;

  const currentBook = BOOKS.find((b) => b.bookCode === bookCode);
  const bookName = getBookName(bookCode, primaryLang);
  const maxChapter = currentBook?.maxChapter ?? 1;

  const goPrevChapter = useCallback(() => {
    if (chapter > 1) {
      setChapter((c) => c - 1);
    } else {
      const idx = BOOKS.findIndex((b) => b.bookCode === bookCode);
      if (idx > 0) {
        const prev = BOOKS[idx - 1];
        setBookCode(prev.bookCode);
        setChapter(prev.maxChapter);
      }
    }
  }, [bookCode, chapter]);

  const goNextChapter = useCallback(() => {
    if (chapter < maxChapter) {
      setChapter((c) => c + 1);
    } else {
      const idx = BOOKS.findIndex((b) => b.bookCode === bookCode);
      if (idx >= 0 && idx < BOOKS.length - 1) {
        setBookCode(BOOKS[idx + 1].bookCode);
        setChapter(1);
      }
    }
  }, [bookCode, chapter, maxChapter]);

  const openBookPicker = useCallback(() => {
    setPickerStep('book');
    setShowBookDrawer(true);
  }, []);

  const selectBook = useCallback((code: string) => {
    setBookCode(code);
    setPickerStep('chapter');
  }, []);

  const selectChapter = useCallback((ch: number) => {
    setChapter(ch);
    setShowBookDrawer(false);
  }, []);

  const closeBookDrawer = useCallback(() => setShowBookDrawer(false), []);
  const openLangPicker = useCallback(() => {
    setShowLangDrawer(true);
    setShowSettingsDrawer(false);
  }, []);
  const openSettings = useCallback(() => {
    setShowSettingsDrawer(true);
    setShowLangDrawer(false);
  }, []);
  const closeLangDrawer = useCallback(() => {
    setShowLangDrawer(false);
    setShowSecondarySelector(false);
  }, []);
  const closeSettingsDrawer = useCallback(() => {
    setShowSettingsDrawer(false);
    setShowSecondarySelector(false);
  }, []);

  const onSelectPrimaryLang = useCallback((val: BibleLang) => {
    setPrimaryLang(val);
    setDualLang(false);
    if (secondaryLang === val) {
      const fallback = (LANG_OPTIONS.find((v) => v.val !== val)?.val as BibleLang) ?? 'ko';
      setSecondaryLang(fallback);
    }
    setShowLangDrawer(false);
  }, [secondaryLang]);

  const toggleVerseSelection = useCallback((verseNumber: number) => {
    setSelectedVerseNumbers((prev) => {
      if (prev.includes(verseNumber)) {
        // 선택 해제: 진동 없음
        return prev.filter((n) => n !== verseNumber);
      }
      // 새로 선택될 때만 약한 진동
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return [...prev, verseNumber];
    });
  }, []);

  const clearVerseSelection = useCallback(() => setSelectedVerseNumbers([]), []);

  const copySelectedVerses = useCallback(async () => {
    if (!selectedVerseNumbers.length || !bookName) return;
    // 절 번호별로 첫 번째 매칭만 사용 (영어 등 API 중복 응답 방지)
    const uniqueVerseNumbers = [...new Set(selectedVerseNumbers)].sort((a, b) => a - b);
    const contentList = uniqueVerseNumbers
      .map((verseNum) => {
        const v = verses.find((x) => x.verse === verseNum);
        return v ? { verse: v.verse, content: v.primary, bookName, chapter } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    const text = makeCopyBibles(contentList);
    if (text) {
      await copyTextToClipboard(text);
      setSelectedVerseNumbers([]);
    }
  }, [selectedVerseNumbers, verses, bookName, chapter]);

  const langLabel = primaryLang === 'ko' ? '한국어' : primaryLang === 'en' ? 'English' : 'German';

  return {
    // data
    bookCode,
    chapter,
    bookName,
    maxChapter,
    primaryLang,
    secondaryLang,
    dualLang,
    fontScale,
    verses,
    loading,
    error,
    selectedVerseNumbers,
    pickerStep,
    showSecondarySelector,
    BOOKS,
    LANG_OPTIONS,
    FONT_STEPS,
    versions,
    langLabel,
    // drawer visibility
    showBookDrawer,
    showLangDrawer,
    showSettingsDrawer,
    // actions
    goPrevChapter,
    goNextChapter,
    openBookPicker,
    selectBook,
    selectChapter,
    closeBookDrawer,
    openLangPicker,
    openSettings,
    closeLangDrawer,
    closeSettingsDrawer,
    onSelectPrimaryLang,
    toggleVerseSelection,
    clearVerseSelection,
    copySelectedVerses,
    setDualLang,
    setSecondaryLang,
    setShowSecondarySelector,
    setFontScale,
    setPickerStep,
    getBookName,
  };
}
