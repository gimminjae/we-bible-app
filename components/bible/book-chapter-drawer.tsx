import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type BookInfo = { bookCode: string; maxChapter: number };

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
          ? books.map((b) => (
            <Pressable
              key={b.bookCode}
              onPress={() => handleSelectBook(b.bookCode)}
              className="py-3.5 px-1 rounded-xl active:bg-gray-100 dark:active:bg-gray-800"
            >
              <Text className="text-base text-gray-900 dark:text-white">
                {getBookName(b.bookCode, primaryLang)} ({b.maxChapter}장)
              </Text>
            </Pressable>
          ))
          : Array.from({ length: maxChapter }, (_, i) => i + 1).map((ch) => (
            <Pressable
              key={ch}
              onPress={() => handleSelectChapter(ch)}
              className="py-3.5 px-1 rounded-xl active:bg-gray-100 dark:active:bg-gray-800"
            >
              <Text className="text-base text-gray-900 dark:text-white">
                {bookName} {ch}장
              </Text>
            </Pressable>
          ))}
      </ScrollView>
    </BottomSheet>
  );
}
