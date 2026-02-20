import { BottomSheet } from "@/components/ui/bottom-sheet"
import { useResponsive } from "@/hooks/use-responsive"
import {
  BIBLE_CATEGORY_KEYS,
  CATEGORY_BOOK_CODES,
  type BibleCategoryKey,
} from "@/utils/bible-categories"
import { useI18n } from "@/utils/i18n"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { Button, ButtonText } from "../ui/button"

type BookInfo = { bookCode: string; maxChapter: number }

type BookChapterDrawerProps = {
  isOpen: boolean
  onClose: () => void
  pickerStep: "book" | "chapter"
  bookName: string
  maxChapter: number
  books: BookInfo[]
  primaryLang: string
  getBookName: (code: string, lang: string) => string
  onSelectBook: (code: string) => void
  onSelectChapter: (ch: number) => void
  onBackToBookList: () => void
}

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
  const [category, setCategory] = useState<BibleCategoryKey>("ot")
  const { t } = useI18n()
  const { scale, moderateScale } = useResponsive()

  useEffect(() => {
    if (isOpen && pickerStep === "book") {
      setCategory("ot")
    }
  }, [isOpen, pickerStep])

  const filteredBooks = useMemo(() => {
    const allowedCodes = new Set(CATEGORY_BOOK_CODES[category])
    return books.filter((b) => allowedCodes.has(b.bookCode))
  }, [books, category])

  const handleSelectBook = useCallback(
    (code: string) => {
      onSelectBook(code)
    },
    [onSelectBook],
  )
  const handleSelectChapter = useCallback(
    (ch: number) => {
      onSelectChapter(ch)
    },
    [onSelectChapter],
  )

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.75}>
      <View
        className="border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(8),
        }}
      >
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: moderateScale(18) }}
        >
          {""}
        </Text>
        <View className="flex-row items-center" style={{ gap: scale(8) }}>
          <Pressable onPress={onClose} style={{ paddingHorizontal: scale(8), paddingVertical: scale(4) }}>
            <Text
              className="text-gray-600 dark:text-gray-400"
              style={{ fontSize: moderateScale(16) }}
            >
              ✕
            </Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingVertical: scale(8),
        }}
        showsVerticalScrollIndicator
      >
        {pickerStep === "book" ? (
          <>
            <View
              className="flex-row flex-wrap items-center"
              style={{ gap: scale(8), marginBottom: scale(12) }}
            >
                {BIBLE_CATEGORY_KEYS.map((categoryKey) => {
                const selected = category === categoryKey
                return (
                  <Button
                    className="rounded-xl"
                    key={categoryKey}
                    variant="solid"
                    size="sm"
                    action={selected ? "primary" : "secondary"}
                    onPress={() => setCategory(categoryKey)}
                  >
                    <ButtonText>
                      {categoryKey === "ot"
                        ? t("bibleDrawer.oldTestament")
                        : categoryKey === "nt"
                          ? t("bibleDrawer.newTestament")
                          : t(`bibleDrawer.category.${categoryKey}`)}
                    </ButtonText>
                  </Button>
                )
              })}
            </View>
            {filteredBooks.map((b) => (
              <Pressable
                key={b.bookCode}
                onPress={() => handleSelectBook(b.bookCode)}
                className="rounded-xl active:bg-gray-100 dark:active:bg-gray-800"
                style={{ paddingVertical: scale(14), paddingHorizontal: scale(4) }}
              >
                <Text
                  className="text-gray-900 dark:text-white"
                  style={{ fontSize: moderateScale(16) }}
                >
                  {getBookName(b.bookCode, primaryLang)} ({b.maxChapter})
                </Text>
              </Pressable>
            ))}
          </>
        ) : (
          <View className="flex-row flex-wrap">
            {Array.from({ length: maxChapter }, (_, i) => i + 1).map((ch) => (
              <View key={ch} className="w-1/5" style={{ padding: scale(4) }}>
                <Pressable
                  onPress={() => handleSelectChapter(ch)}
                  className="rounded-lg items-center justify-center active:bg-gray-100 dark:active:bg-gray-800"
                  style={{
                    paddingVertical: scale(10),
                    paddingHorizontal: scale(4),
                  }}
                >
                  <Text
                    className="text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(16) }}
                  >
                    {ch}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  )
}
