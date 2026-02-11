import type { BibleVerse } from '@/domain/bible/bible';
import bibleService, { bibleInfos, getBookName, versions } from '@/services/bible';
import { useCallback, useEffect, useState } from 'react';
import type { BibleLang, DisplayVerse } from './types';

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

  const [verses, setVerses] = useState<DisplayVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showBookDrawer, setShowBookDrawer] = useState(false);
  const [pickerStep, setPickerStep] = useState<'book' | 'chapter'>('book');
  const [showLangDrawer, setShowLangDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showSecondarySelector, setShowSecondarySelector] = useState(false);

  const currentBook = BOOKS.find((b) => b.bookCode === bookCode);
  const bookName = getBookName(bookCode, primaryLang);
  const maxChapter = currentBook?.maxChapter ?? 1;

  const loadBible = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (dualLang) {
        const [primaryData, secondaryData] = await Promise.all([
          bibleService.getBible({ bookCode, chapter, lang: primaryLang }),
          bibleService.getBible({ bookCode, chapter, lang: secondaryLang }),
        ]);
        const normalizedPrimary: BibleVerse[] = Array.isArray(primaryData) ? primaryData : [];
        const normalizedSecondary: BibleVerse[] = Array.isArray(secondaryData) ? secondaryData : [];
        const merged: DisplayVerse[] = normalizedPrimary.map((p, index) => ({
          verse: p.verse ?? index + 1,
          primary: p.content ?? '',
          secondary: normalizedSecondary[index]?.content ?? '',
        }));
        setVerses(merged);
      } else {
        const data = await bibleService.getBible({ bookCode, chapter, lang: primaryLang });
        const normalized: BibleVerse[] = Array.isArray(data) ? data : [];
        setVerses(
          normalized.map((v, index) => ({
            verse: v.verse ?? index + 1,
            primary: v.content ?? '',
          }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, [bookCode, chapter, primaryLang, dualLang, secondaryLang]);

  useEffect(() => {
    loadBible();
  }, [loadBible]);

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
    loadBible,
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
    setDualLang,
    setSecondaryLang,
    setShowSecondarySelector,
    setFontScale,
    setPickerStep,
    getBookName,
  };
}
