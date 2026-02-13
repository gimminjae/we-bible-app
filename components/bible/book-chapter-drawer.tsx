import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useI18n } from '@/utils/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type BookInfo = { bookCode: string; maxChapter: number; bookSeq?: number };

type BookChapterDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  pickerStep: 'book' | 'chapter';
  bookName: string;
  maxChapter: number;
  books: BookInfo[];
  primaryLang: string;
  getBookName: (code: string, lang: string) => string;
  onSelectBook: (code: string) => void;
  onSelectChapter: (ch: number) => void;
  onBackToBookList: () => void;
};

export function BookChapterDrawer({
  isOpen,
  onClose,
  pickerStep,
  bookName,
  maxChapter,
  books,
  primaryLang,
  getBookName,
  onSelectBook,
  onSelectChapter,
  onBackToBookList,
}: BookChapterDrawerProps) {
  const [testament, setTestament] = useState<'ot' | 'nt'>('ot');
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen && pickerStep === 'book') {
      setTestament('ot');
    }
  }, [isOpen, pickerStep]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const seq = b.bookSeq ?? 0;
      if (seq <= 0) return false;
      if (testament === 'ot') return seq <= 39;
      return seq >= 40;
    });
  }, [books, testament]);

  const handleSelectBook = useCallback(
    (code: string) => {
      onSelectBook(code);
    },
    [onSelectBook]
  );
  const handleSelectChapter = useCallback(
    (ch: number) => {
      onSelectChapter(ch);
    },
    [onSelectChapter]
  );

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.75}>
      <View className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {''}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600 dark:text-gray-400">✕</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        showsVerticalScrollIndicator
      >
        {pickerStep === 'book'
          ? (
            <>
              <View className="flex-row items-center gap-2 mb-3">
                <Pressable
                  onPress={() => setTestament('ot')}
                  className={`px-4 py-2 rounded-xl ${testament === 'ot' ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                >
                  <Text className={`text-base font-semibold ${testament === 'ot' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t('bibleDrawer.oldTestament')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTestament('nt')}
                  className={`px-4 py-2 rounded-xl ${testament === 'nt' ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                >
                  <Text className={`text-base font-semibold ${testament === 'nt' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t('bibleDrawer.newTestament')}
                  </Text>
                </Pressable>
              </View>
              {filteredBooks.map((b) => (
                <Pressable
                  key={b.bookCode}
                  onPress={() => handleSelectBook(b.bookCode)}
                  className="py-3.5 px-1 rounded-xl active:bg-gray-100 dark:active:bg-gray-800"
                >
                  <Text className="text-base text-gray-900 dark:text-white">
                    {getBookName(b.bookCode, primaryLang)} ({b.maxChapter})
                  </Text>
                </Pressable>
              ))}
            </>
          )
          : (
            <View className="flex-row flex-wrap">
              {Array.from({ length: maxChapter }, (_, i) => i + 1).map((ch) => (
                <View key={ch} className="w-1/5 p-1">
                  <Pressable
                    onPress={() => handleSelectChapter(ch)}
                    className="py-2.5 px-1 rounded-lg items-center justify-center active:bg-gray-100 dark:active:bg-gray-800"
                  >
                    <Text className="text-base text-gray-900 dark:text-white">
                      {ch}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
      </ScrollView>
    </BottomSheet>
  );
}
