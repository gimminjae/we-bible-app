import type { BibleVerse } from '@/domain/bible/bible';
import bibleService, {
  bibleInfos,
  getBookName,
  versions,
} from '@/services/bible';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

const LANG_OPTIONS = versions.filter((v) => v.val === 'ko' || v.val === 'en');
const BOOKS = bibleInfos.filter((b) => b.bookSeq > 0);

export default function HomeScreen() {
  const [bookCode, setBookCode] = useState('genesis');
  const [chapter, setChapter] = useState(1);
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [pickerStep, setPickerStep] = useState<'book' | 'chapter'>('book');

  const currentBook = BOOKS.find((b) => b.bookCode === bookCode);
  const bookName = getBookName(bookCode, lang);
  const maxChapter = currentBook?.maxChapter ?? 1;

  const loadBible = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bibleService.getBible({
        bookCode,
        chapter,
        lang,
      });
      setVerses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, [bookCode, chapter, lang]);

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

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header: 성경 선택 + 언어 선택 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <Pressable
          onPress={openBookPicker}
          className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 active:opacity-80"
        >
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {bookName} {chapter}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          {LANG_OPTIONS.map((opt) => (
            <Pressable
              key={opt.val}
              onPress={() => setLang(opt.val as 'ko' | 'en')}
              className={`px-3 py-2 rounded-lg ${lang === opt.val ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              <Text
                className={`text-sm font-medium ${lang === opt.val ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {opt.txt}
              </Text>
            </Pressable>
          ))}
        </View>
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
              <Text className="flex-1 text-base text-gray-900 dark:text-gray-100 leading-6">
                {v.content ?? ''}
              </Text>
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

      {/* Book/Chapter Drawer (왼쪽에서 나오는 드로어) */}
      {showBookModal && (
        <View className="absolute inset-0 flex-row">
          {/* 반투명 배경 */}
          <Pressable
            className="flex-1 bg-black/40"
            onPress={() => setShowBookModal(false)}
          />

          {/* Drawer 본체 */}
          <View className="w-72 max-w-[80%] h-full bg-white dark:bg-gray-900 shadow-2xl">
            {/* 헤더 */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {pickerStep === 'book' ? '성경 책 선택' : '장 선택'}
              </Text>
              <Pressable
                onPress={() =>
                  pickerStep === 'chapter'
                    ? setPickerStep('book')
                    : setShowBookModal(false)
                }
                className="px-2 py-1 rounded-lg active:opacity-80"
              >
                <Text className="text-sm text-blue-500 font-medium">
                  {pickerStep === 'chapter' ? '책 목록' : '닫기'}
                </Text>
              </Pressable>
            </View>

            {/* 내용 */}
            <ScrollView className="py-2">
              {pickerStep === 'book'
                ? BOOKS.map((b) => (
                  <Pressable
                    key={b.bookCode}
                    onPress={() => selectBook(b.bookCode)}
                    className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
                  >
                    <Text className="text-base text-gray-900 dark:text-white">
                      {getBookName(b.bookCode, lang)} ({b.maxChapter}장)
                    </Text>
                  </Pressable>
                ))
                : Array.from({ length: maxChapter }, (_, i) => i + 1).map((ch) => (
                  <Pressable
                    key={ch}
                    onPress={() => selectChapter(ch)}
                    className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
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
    </View>
  );
}
