import type { BibleVerse } from '@/domain/bible/bible';
import bibleService, { bibleInfos, getBookName, versions } from '@/services/bible';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANG_OPTIONS = versions; // ko, en, de 모두 사용
const BOOKS = bibleInfos.filter((b) => b.bookSeq > 0);

type DisplayVerse = {
  verse: number;
  primary: string;
  secondary?: string;
};

export default function HomeScreen() {
  const [bookCode, setBookCode] = useState('genesis');
  const [chapter, setChapter] = useState(1);
  const [primaryLang, setPrimaryLang] = useState<'ko' | 'en' | 'de'>('ko');
  const [secondaryLang, setSecondaryLang] = useState<'ko' | 'en' | 'de'>('en'); // 이중언어 보조 언어
  const [dualLang, setDualLang] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  const [verses, setVerses] = useState<DisplayVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [pickerStep, setPickerStep] = useState<'book' | 'chapter'>('book');
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showSecondarySelector, setShowSecondarySelector] = useState(false);

  // Bottom sheet drag 공용 ref
  const dragStartY = useRef<number | null>(null);

  const currentBook = BOOKS.find((b) => b.bookCode === bookCode);
  const bookName = getBookName(bookCode, primaryLang);
  const maxChapter = currentBook?.maxChapter ?? 1;

  const loadBible = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (dualLang) {
        // 이중 언어: 주언어 + 보조 언어 (언어 조합 자유)
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
        // 단일 언어: 선택한 주 언어 그대로 사용
        const data = await bibleService.getBible({
          bookCode,
          chapter,
          lang: primaryLang,
        });
        const normalized: BibleVerse[] = Array.isArray(data) ? data : [];
        const mapped: DisplayVerse[] = normalized.map((v, index) => ({
          verse: v.verse ?? index + 1,
          primary: v.content ?? '',
        }));
        setVerses(mapped);
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

  const goPrevChapter = () => {
    if (chapter > 1) setChapter((c) => c - 1);
    else {
      const idx = BOOKS.findIndex((b) => b.bookCode === bookCode);
      if (idx > 0) {
        const prev = BOOKS[idx - 1];
        setBookCode(prev.bookCode);
        setChapter(prev.maxChapter);
      }
    }
  };

  const goNextChapter = () => {
    if (chapter < maxChapter) setChapter((c) => c + 1);
    else {
      const idx = BOOKS.findIndex((b) => b.bookCode === bookCode);
      if (idx >= 0 && idx < BOOKS.length - 1) {
        setBookCode(BOOKS[idx + 1].bookCode);
        setChapter(1);
      }
    }
  };

  const openBookPicker = () => {
    setPickerStep('book');
    setShowBookModal(true);
  };

  const selectBook = (code: string) => {
    setBookCode(code);
    setPickerStep('chapter');
  };

  const selectChapter = (ch: number) => {
    setChapter(ch);
    setShowBookModal(false);
  };

  const openLangPicker = () => {
    setShowLangSheet(true);
    setShowSettingsSheet(false);
  };

  const openSettings = () => {
    setShowSettingsSheet(true);
    setShowLangSheet(false);
  };

  const closeSheets = () => {
    setShowLangSheet(false);
    setShowSettingsSheet(false);
    setShowSecondarySelector(false);
  };

  const onSelectPrimaryLang = (val: 'ko' | 'en' | 'de') => {
    setPrimaryLang(val);
    setDualLang(false); // 단일 언어 모드로 전환
    // 보조 언어가 주언어와 같다면 다른 언어로 기본 설정
    if (secondaryLang === val) {
      const fallback =
        (LANG_OPTIONS.find((v) => v.val !== val)?.val as 'ko' | 'en' | 'de') ?? 'ko';
      setSecondaryLang(fallback);
    }
    setShowLangSheet(false);
  };

  // 글자 크기 슬라이더용 간단한 단계
  const FONT_STEPS = [0.8, 0.9, 1, 1.1, 1.2];

  // Bottom sheet 공용 drag-to-close responder props
  const getSheetResponderProps = (onClose: () => void) => ({
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: any) => {
      dragStartY.current = e.nativeEvent.pageY;
    },
    onResponderMove: (e: any) => {
      if (dragStartY.current == null) return;
      const dy = e.nativeEvent.pageY - dragStartY.current;
      if (dy > 40) {
        dragStartY.current = null;
        onClose();
      }
    },
    onResponderRelease: () => {
      dragStartY.current = null;
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1">
        {/* Header: 성경 선택 + 언어 선택 + Tt */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* 왼쪽: 책/장 + 언어 칩 */}
          <View className="flex-row items-center">
            <View className="flex-row border border-blue-500 rounded-md overflow-hidden">
              <Pressable
                onPress={openBookPicker}
                className="px-3 py-1.5 bg-white dark:bg-gray-900"
              >
                <Text className="text-sm font-semibold text-blue-600">
                  {bookName} {chapter}
                </Text>
              </Pressable>
              <View className="w-px bg-blue-500 opacity-60" />
              <Pressable
                onPress={openLangPicker}
                className="px-3 py-1.5 bg-white dark:bg-gray-900"
              >
                <Text className="text-sm font-semibold text-blue-600">
                  {primaryLang === 'ko'
                    ? '한국어'
                    : primaryLang === 'en'
                      ? 'English'
                      : 'German'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 오른쪽: Tt 버튼 (설정 시트) */}
          <Pressable
            onPress={openSettings}
            className="px-2 py-1 rounded-md active:opacity-70"
          >
            <Text className="text-lg font-semibold text-gray-700 dark:text-gray-200">Tt</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : error ? (
            <Text className="text-red-500 text-center py-8">{error}</Text>
          ) : (
            verses.map((v, i) => (
              <View key={i} className="flex-row gap-2 mb-3">
                <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[24px]">
                  {v.verse ?? i + 1}
                </Text>
                <View className="flex-1">
                  <Text
                    className="text-base text-gray-900 dark:text-gray-100"
                    style={{ fontSize: 16 * fontScale, lineHeight: 24 * fontScale }}
                  >
                    {v.primary}
                  </Text>
                  {dualLang && v.secondary ? (
                    <Text
                      className="text-sm text-gray-700 dark:text-gray-300 mt-1"
                      style={{ fontSize: 14 * fontScale, lineHeight: 20 * fontScale }}
                    >
                      {v.secondary}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Prev/Next chapter */}
        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-4">
          <Pressable
            onPress={goPrevChapter}
            className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center active:opacity-80"
          >
            <Text className="text-white text-xl">←</Text>
          </Pressable>
          <Pressable
            onPress={goNextChapter}
            className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center active:opacity-80"
          >
            <Text className="text-white text-xl">→</Text>
          </Pressable>
        </View>

        {/* Book/Chapter Drawer (아래에서 올라오는 드로어) */}
        {showBookModal && (
          <View className="absolute inset-0 justify-end">
            <Pressable className="flex-1 bg-black/40" onPress={() => setShowBookModal(false)} />
            <View
              className="bg-white dark:bg-gray-900 rounded-t-2xl px-4 pt-3 pb-6 max-h-[80%]"
              {...getSheetResponderProps(() => setShowBookModal(false))}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {pickerStep === 'book' ? '성경 책 선택' : '장 선택'}
                </Text>
                <Pressable
                  onPress={() =>
                    pickerStep === 'chapter' ? setPickerStep('book') : setShowBookModal(false)
                  }
                  className="px-2 py-1 rounded-lg active:opacity-80"
                >
                  <Text className="text-sm text-blue-500 font-medium">
                    {pickerStep === 'chapter' ? '책 목록' : '닫기'}
                  </Text>
                </Pressable>
              </View>

              <ScrollView className="mt-1">
                {pickerStep === 'book'
                  ? BOOKS.map((b) => (
                    <Pressable
                      key={b.bookCode}
                      onPress={() => selectBook(b.bookCode)}
                      className="py-3 border-b border-gray-100 dark:border-gray-800"
                    >
                      <Text className="text-base text-gray-900 dark:text-white">
                        {getBookName(b.bookCode, primaryLang)} ({b.maxChapter}장)
                      </Text>
                    </Pressable>
                  ))
                  : Array.from({ length: maxChapter }, (_, i) => i + 1).map((ch) => (
                    <Pressable
                      key={ch}
                      onPress={() => selectChapter(ch)}
                      className="py-3 border-b border-gray-100 dark:border-gray-800"
                    >
                      <Text className="text-base text-gray-900 dark:text-white">
                        {bookName} {ch}장
                      </Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* 언어 선택 Bottom Sheet */}
        {showLangSheet && (
          <View className="absolute inset-0 justify-end">
            <Pressable className="flex-1 bg-black/40" onPress={closeSheets} />
            <View
              className="bg-white dark:bg-gray-900 rounded-t-2xl px-4 pt-3 pb-6"
              {...getSheetResponderProps(closeSheets)}
            >
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                언어 선택
              </Text>
              {LANG_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.val}
                  onPress={() => onSelectPrimaryLang(opt.val as 'ko' | 'en' | 'de')}
                  className="py-3 border-b border-gray-100 dark:border-gray-800"
                >
                  <Text className="text-sm text-gray-900 dark:text-white">
                    {opt.txt} ({opt.description})
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Tt 설정 Bottom Sheet */}
        {showSettingsSheet && (
          <View className="absolute inset-0 justify-end">
            <Pressable className="flex-1 bg-black/40" onPress={closeSheets} />
            <View
              className="bg-white dark:bg-gray-900 rounded-t-2xl px-4 pt-3 pb-6"
              {...getSheetResponderProps(closeSheets)}
            >
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                읽기 설정
              </Text>

              {/* 이중언어 모드 */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm text-gray-900 dark:text-white">이중언어모드</Text>
                <Switch
                  value={dualLang}
                  onValueChange={(val) => {
                    setDualLang(val);
                    if (val && secondaryLang === primaryLang) {
                      // 주언어와 다른 보조 언어 하나 자동 선택
                      const fallback =
                        (LANG_OPTIONS.find((v) => v.val !== primaryLang)?.val as
                          | 'ko'
                          | 'en'
                          | 'de') ?? primaryLang;
                      setSecondaryLang(fallback);
                    }
                  }}
                />
              </View>

              {/* (옵션) 이중언어일 때 보조 언어 선택 – English / German */}
              {dualLang && (
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">보조 언어</Text>
                    <Pressable
                      onPress={() => setShowSecondarySelector((prev) => !prev)}
                      className="flex-row items-center px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800"
                    >
                      <Text className="text-sm text-gray-900 dark:text-white mr-1">
                        {versions.find((v) => v.val === secondaryLang)?.txt ?? 'English'}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">▾</Text>
                    </Pressable>
                  </View>

                  {showSecondarySelector && (
                    <View className="mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      {versions
                        .filter((v) => v.val !== primaryLang)
                        .map((opt) => (
                          <Pressable
                            key={opt.val}
                            onPress={() => {
                              setSecondaryLang(opt.val as 'ko' | 'en' | 'de');
                              setShowSecondarySelector(false);
                            }}
                            className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                          >
                            <Text className="text-sm text-gray-900 dark:text-white">
                              {opt.txt} ({opt.description})
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  )}
                </View>
              )}

              {/* 글자 크기 슬라이더 (단일/이중 모두에 적용) */}
              <View className="mb-2">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-gray-900 dark:text-white">글자 크기</Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    {Math.round(fontScale * 100)}%
                  </Text>
                </View>

                <View className="flex-row items-center justify-between px-1 mt-1 mb-1">
                  {FONT_STEPS.map((step) => (
                    <Pressable
                      key={step}
                      onPress={() => setFontScale(step)}
                      className="flex-1 items-center"
                    >
                      <View
                        className={`h-3 w-full rounded-full ${fontScale >= step ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
