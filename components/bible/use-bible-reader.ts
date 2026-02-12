import { useBibleQuery } from '@/hooks/use-bible-query';
import { useFavoriteVerses } from '@/hooks/use-favorite-verses';
import { useMemoVerses } from '@/hooks/use-memo-verses';
import { bibleInfos, getBookName, versions } from '@/services/bible';
import { getBibleSearchInfo, setBibleSearchInfo } from '@/utils/bible-storage';
import { makeCopyBibles } from '@/utils/bible.util';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { BibleLang } from './types';

const VALID_LANGS: BibleLang[] = ['ko', 'en', 'de'];
function isValidLang(s: string): s is BibleLang {
  return VALID_LANGS.includes(s as BibleLang);
}

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
  const db = useSQLiteContext();
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
  const [showMemoDrawer, setShowMemoDrawer] = useState(false);
  const [showSecondarySelector, setShowSecondarySelector] = useState(false);
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);
  const [hasRestored, setHasRestored] = useState(false);

  const restoreBibleSearchInfoFromStorage = useCallback(() => {
    if (hasRestored) return;
    let cancelled = false;
    getBibleSearchInfo(db).then((saved) => {
      if (cancelled || !saved) {
        setHasRestored(true);
        return;
      }
      const bookExists = BOOKS.some((b) => b.bookCode === saved.bookCode);
      const currentBook = bookExists
        ? BOOKS.find((b) => b.bookCode === saved.bookCode)!
        : BOOKS[0];
      const maxCh = currentBook?.maxChapter ?? 1;
      const ch = Math.min(Math.max(1, saved.chapter), maxCh);
      setBookCode(currentBook?.bookCode ?? 'genesis');
      setChapter(ch);
      if (isValidLang(saved.primaryLang)) setPrimaryLang(saved.primaryLang);
      if (isValidLang(saved.secondaryLang)) setSecondaryLang(saved.secondaryLang);
      setDualLang(Boolean(saved.dualLang));
      if (typeof saved.fontScale === 'number' && saved.fontScale >= 0.8 && saved.fontScale <= 1.2) {
        setFontScale(saved.fontScale);
      }
      setHasRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hasRestored, db]);

  const persistBibleSearchInfo = useCallback(() => {
    if (!hasRestored) return;
    void setBibleSearchInfo(
      {
        bookCode,
        chapter,
        primaryLang,
        fontScale,
        dualLang,
        secondaryLang,
      },
      db
    );
  }, [hasRestored, bookCode, chapter, primaryLang, fontScale, dualLang, secondaryLang, db]);

  const clearSelectedVersesOnBookOrChapterChange = useCallback(() => {
    setSelectedVerseNumbers([]);
  }, []);

  useEffect(restoreBibleSearchInfoFromStorage, [restoreBibleSearchInfoFromStorage]);
  useEffect(persistBibleSearchInfo, [persistBibleSearchInfo]);
  useEffect(clearSelectedVersesOnBookOrChapterChange, [
    bookCode,
    chapter,
    clearSelectedVersesOnBookOrChapterChange,
  ]);

  const { data: verses = [], isLoading: loading, error: queryError } = useBibleQuery({
    bookCode,
    chapter,
    primaryLang,
    dualLang,
    secondaryLang,
  });

  const { favoriteVerseNumbers, addVerses: addFavoriteVerses, removeVerses: removeFavoriteVerses } =
    useFavoriteVerses(bookCode, chapter);
  const { memoVerseNumbers, addMemo: addMemoToDb } = useMemoVerses(bookCode, chapter);

  const allSelectedAreFavorites =
    selectedVerseNumbers.length > 0 &&
    selectedVerseNumbers.every((n) => favoriteVerseNumbers.includes(n));

  const addSelectedToFavorites = useCallback(() => {
    const toAdd = [...new Set(selectedVerseNumbers)].filter((n) => !favoriteVerseNumbers.includes(n));
    if (toAdd.length === 0) return;
    const versesWithText = toAdd
      .map((verseNum) => {
        const v = verses.find((x) => x.verse === verseNum);
        return v ? { verse: verseNum, text: v.primary } : null;
      })
      .filter((x): x is { verse: number; text: string } => x != null);
    if (versesWithText.length > 0) {
      addFavoriteVerses(versesWithText).then(() => setSelectedVerseNumbers([]));
    }
  }, [selectedVerseNumbers, favoriteVerseNumbers, verses, addFavoriteVerses]);

  const removeSelectedFromFavorites = useCallback(() => {
    const toRemove = [...new Set(selectedVerseNumbers)].filter((n) =>
      favoriteVerseNumbers.includes(n)
    );
    if (toRemove.length > 0) {
      removeFavoriteVerses(toRemove).then(() => setSelectedVerseNumbers([]));
    }
  }, [selectedVerseNumbers, favoriteVerseNumbers, removeFavoriteVerses]);

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load') : null;

  const currentBook = BOOKS.find((b) => b.bookCode === bookCode);
  const bookName = getBookName(bookCode, primaryLang);

  const memoInitialContent = useMemo(() => {
    if (!selectedVerseNumbers.length || !bookName) return '';
    const uniqueVerseNumbers = [...new Set(selectedVerseNumbers)].sort((a, b) => a - b);
    const contentList = uniqueVerseNumbers
      .map((verseNum) => {
        const v = verses.find((x) => x.verse === verseNum);
        return v ? { verse: v.verse, content: v.primary, bookName, chapter } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    return makeCopyBibles(contentList);
  }, [selectedVerseNumbers, verses, bookName, chapter]);

  const openMemoDrawer = useCallback(() => setShowMemoDrawer(true), []);
  const closeMemoDrawer = useCallback(() => setShowMemoDrawer(false), []);

  const saveMemo = useCallback(
    (title: string, content: string) => {
      const toSave = [...new Set(selectedVerseNumbers)];
      if (toSave.length === 0) return;
      const verseText = memoInitialContent;
      addMemoToDb(title, content, verseText, toSave).then(() => {
        setSelectedVerseNumbers([]);
        setShowMemoDrawer(false);
      });
    },
    [selectedVerseNumbers, memoInitialContent, addMemoToDb]
  );
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
    favoriteVerseNumbers,
    memoVerseNumbers,
    allSelectedAreFavorites,
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
    showMemoDrawer,
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
    openMemoDrawer,
    closeMemoDrawer,
    memoInitialContent,
    saveMemo,
    onSelectPrimaryLang,
    toggleVerseSelection,
    clearVerseSelection,
    copySelectedVerses,
    addSelectedToFavorites,
    removeSelectedFromFavorites,
    setDualLang,
    setSecondaryLang,
    setShowSecondarySelector,
    setFontScale,
    setPickerStep,
    getBookName,
  };
}
