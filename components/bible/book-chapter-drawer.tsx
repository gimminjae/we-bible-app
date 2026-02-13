import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useI18n } from '@/utils/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type BookInfo = { bookCode: string; maxChapter: number };
type CategoryKey =
  | 'ot'
  | 'nt'
  | 'pentateuch'
  | 'history'
  | 'poetry'
  | 'prophecy'
  | 'gospels'
  | 'epistles';

const CATEGORY_BOOK_CODES: Record<CategoryKey, string[]> = {
  ot: [
    'genesis',
    'exodus',
    'leviticus',
    'numbers',
    'deuteronomy',
    'joshua',
    'judges',
    'ruth',
    '1samuel',
    '2samuel',
    '1kings',
    '2kings',
    '1chronicles',
    '2chronicles',
    'ezra',
    'nehemiah',
    'esther',
    'job',
    'psalms',
    'proverbs',
    'ecclesiastes',
    'songofsolomon',
    'isaiah',
    'jeremiah',
    'lamentations',
    'ezekiel',
    'daniel',
    'hosea',
    'joel',
    'amos',
    'obadiah',
    'jonah',
    'micah',
    'nahum',
    'habakkuk',
    'zephaniah',
    'haggai',
    'zechariah',
    'malachi',
  ],
  nt: [
    'matthew',
    'mark',
    'luke',
    'john',
    'acts',
    'romans',
    '1corinthians',
    '2corinthians',
    'galatians',
    'ephesians',
    'philippians',
    'colossians',
    '1thessalonians',
    '2thessalonians',
    '1timothy',
    '2timothy',
    'titus',
    'philemon',
    'hebrews',
    'james',
    '1peter',
    '2peter',
    '1john',
    '2john',
    '3john',
    'jude',
    'revelation',
  ],
  pentateuch: ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'],
  history: [
    'joshua',
    'judges',
    'ruth',
    '1samuel',
    '2samuel',
    '1kings',
    '2kings',
    '1chronicles',
    '2chronicles',
    'ezra',
    'nehemiah',
    'esther',
  ],
  poetry: ['job', 'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon'],
  prophecy: [
    'isaiah',
    'jeremiah',
    'lamentations',
    'ezekiel',
    'daniel',
    'hosea',
    'joel',
    'amos',
    'obadiah',
    'jonah',
    'micah',
    'nahum',
    'habakkuk',
    'zephaniah',
    'haggai',
    'zechariah',
    'malachi',
  ],
  gospels: ['matthew', 'mark', 'luke', 'john'],
  epistles: [
    'acts',
    'romans',
    '1corinthians',
    '2corinthians',
    'galatians',
    'ephesians',
    'philippians',
    'colossians',
    '1thessalonians',
    '2thessalonians',
    '1timothy',
    '2timothy',
    'titus',
    'philemon',
    'hebrews',
    'james',
    '1peter',
    '2peter',
    '1john',
    '2john',
    '3john',
    'jude',
    'revelation',
  ],
};

const CATEGORY_BUTTONS: CategoryKey[] = [
  'ot',
  'nt',
  'pentateuch',
  'history',
  'poetry',
  'prophecy',
  'gospels',
  'epistles',
];

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
  const [category, setCategory] = useState<CategoryKey>('ot');
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen && pickerStep === 'book') {
      setCategory('ot');
    }
  }, [isOpen, pickerStep]);

  const filteredBooks = useMemo(() => {
    const allowedCodes = new Set(CATEGORY_BOOK_CODES[category]);
    return books.filter((b) => allowedCodes.has(b.bookCode));
  }, [books, category]);

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
              <View className="flex-row flex-wrap items-center gap-2 mb-3">
                {CATEGORY_BUTTONS.map((categoryKey) => {
                  const selected = category === categoryKey;
                  return (
                    <Pressable
                      key={categoryKey}
                      onPress={() => setCategory(categoryKey)}
                      className={`px-3.5 py-2 rounded-xl ${selected ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                    >
                      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {categoryKey === 'ot'
                          ? t('bibleDrawer.oldTestament')
                          : categoryKey === 'nt'
                            ? t('bibleDrawer.newTestament')
                            : t(`bibleDrawer.category.${categoryKey}`)}
                      </Text>
                    </Pressable>
                  );
                })}
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
