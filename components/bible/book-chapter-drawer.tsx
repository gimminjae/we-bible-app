import { BottomSheet } from "@/components/ui/bottom-sheet"
import { IconSymbol } from "@/components/ui/icon-symbol"
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
type BibleCategoryInfoSectionKey =
  | "ot"
  | "nt"
  | "pentateuch"
  | "history"
  | "poetry"
  | "prophecy"
  | "gospels"
  | "acts"
  | "epistles"
  | "revelation"

const CATEGORY_INFO_SECTION_KEYS: BibleCategoryInfoSectionKey[] = [
  "ot",
  "nt",
  "pentateuch",
  "history",
  "poetry",
  "prophecy",
  "gospels",
  "acts",
  "epistles",
  "revelation",
]

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
  const [isCategoryInfoOpen, setIsCategoryInfoOpen] = useState(false)
  const { t } = useI18n()
  const { scale, moderateScale, width, sheetMaxWidth, dialogMaxWidth, isTablet, getAdaptiveColumns } = useResponsive()

  const chapterGridColumns = useMemo(() => {
    const availableWidth = Math.min(width, sheetMaxWidth) - scale(40)
    return getAdaptiveColumns(isTablet ? 72 : 60, scale(8), isTablet ? 8 : 5, availableWidth)
  }, [getAdaptiveColumns, isTablet, scale, sheetMaxWidth, width])

  useEffect(() => {
    if (isOpen && pickerStep === "book") {
      setCategory("ot")
    }
    if (!isOpen) {
      setIsCategoryInfoOpen(false)
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

  const handleOpenCategoryInfo = useCallback(() => {
    setIsCategoryInfoOpen(true)
  }, [])

  const handleCloseCategoryInfo = useCallback(() => {
    setIsCategoryInfoOpen(false)
  }, [])

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.75}>
      <View className="flex-1">
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
                className="flex-row items-start justify-between"
                style={{ gap: scale(8), marginBottom: scale(12) }}
              >
                <View className="flex-1 flex-row flex-wrap items-center" style={{ gap: scale(8) }}>
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
                <Button
                  onPress={handleOpenCategoryInfo}
                  action="secondary"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-gray-200 bg-white px-0 dark:border-gray-700 dark:bg-gray-900"
                  style={{ width: scale(36) }}
                  accessibilityLabel={t("bibleDrawer.categoryInfoTitle")}
                >
                  <IconSymbol
                    name="questionmark.circle"
                    size={moderateScale(16)}
                    color="#6b7280"
                  />
                </Button>
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
                <View
                  key={ch}
                  style={{ padding: scale(4), width: `${100 / chapterGridColumns}%` }}
                >
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
        {isCategoryInfoOpen ? (
          <View
            className="absolute inset-0 justify-center bg-black/55"
            style={{ paddingHorizontal: scale(20), paddingVertical: scale(20) }}
          >
            <Pressable
              className="absolute inset-0"
              onPress={handleCloseCategoryInfo}
              accessibilityRole="button"
              accessibilityLabel={t("bibleDrawer.categoryInfoClose")}
            />

            <View
              className="overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
              style={{ width: '100%', maxWidth: dialogMaxWidth, alignSelf: 'center' }}
            >
              <View
                className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800"
                style={{ paddingHorizontal: scale(20), paddingVertical: scale(16) }}
              >
                <Text
                  className="flex-1 font-bold text-gray-900 dark:text-white"
                  style={{ fontSize: moderateScale(18) }}
                >
                  {t("bibleDrawer.categoryInfoTitle")}
                </Text>
                <Pressable
                  onPress={handleCloseCategoryInfo}
                  accessibilityRole="button"
                  accessibilityLabel={t("bibleDrawer.categoryInfoClose")}
                  style={{ paddingHorizontal: scale(8), paddingVertical: scale(4) }}
                >
                  <Text
                    className="text-gray-600 dark:text-gray-400"
                    style={{ fontSize: moderateScale(16) }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: scale(20),
                  paddingVertical: scale(18),
                  paddingBottom: scale(26),
                }}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: isTablet ? 460 : scale(420) }}
              >
                {CATEGORY_INFO_SECTION_KEYS.map((sectionKey) => (
                  <View key={sectionKey} style={{ marginBottom: scale(20) }}>
                    <Text
                      className="font-semibold text-gray-900 dark:text-white"
                      style={{ fontSize: moderateScale(16), lineHeight: moderateScale(24) }}
                    >
                      {t(`bibleDrawer.categoryInfo.${sectionKey}.title`)}
                    </Text>
                    <Text
                      className="mt-2 text-gray-600 dark:text-gray-300"
                      style={{ fontSize: moderateScale(14), lineHeight: moderateScale(24) }}
                    >
                      {t(`bibleDrawer.categoryInfo.${sectionKey}.body`)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </View>
    </BottomSheet>
  )
}
