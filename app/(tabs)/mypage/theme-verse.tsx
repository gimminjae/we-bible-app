import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ThemeVerseSheet } from "@/components/mypage/theme-verse-sheet"
import { Button, ButtonText } from "@/components/ui/button"
import { ScreenHeader } from "@/components/ui/screen-header"
import { useAppSettings } from "@/contexts/app-settings"
import { useToast } from "@/contexts/toast-context"
import { useResponsive } from "@/hooks/use-responsive"
import { formatShortDateTime } from "@/lib/date"
import { syncThemeVerseNotificationSchedule } from "@/lib/theme-verse-notifications"
import { getBookName } from "@/services/bible"
import { useI18n } from "@/utils/i18n"
import {
  canEditThemeVerseYear,
  deleteThemeVerseByYear,
  formatThemeVerseNumbers,
  getAllThemeVerses,
  getCurrentThemeVerseYear,
  upsertThemeVerse,
  type ThemeVerseRecord,
} from "@/utils/theme-verse-db"

function replaceToken(template: string, token: string, value: string) {
  return template.replace(`{${token}}`, value)
}

export default function ThemeVerseDetailScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const { appLanguage } = useAppSettings()
  const { showToast } = useToast()
  const { scale, moderateScale } = useResponsive()

  const currentYear = getCurrentThemeVerseYear()
  const [items, setItems] = useState<ThemeVerseRecord[]>([])
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(() => {
    let active = true
    getAllThemeVerses(db).then((rows) => {
      if (!active) return
      setItems(rows)
    })
    return () => {
      active = false
    }
  }, [db])

  useFocusEffect(load)

  const availableYears = useMemo(() => {
    const merged = new Set<number>([
      currentYear,
      ...items.map((item) => item.year),
    ])
    return [...merged].sort((left, right) => right - left)
  }, [currentYear, items])

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(currentYear)
    }
  }, [availableYears, currentYear, selectedYear])

  const selectedItem = useMemo(
    () => items.find((item) => item.year === selectedYear) ?? null,
    [items, selectedYear],
  )

  const isCurrentYear = canEditThemeVerseYear(selectedYear)

  const handleSave = useCallback(
    async (input: {
      year: number
      bookCode: string
      chapter: number
      verseNumbers: number[]
      verseText: string
      description: string
    }) => {
      try {
        setIsSubmitting(true)
        await upsertThemeVerse(db, input)
        await syncThemeVerseNotificationSchedule(db, { appLanguage })
        showToast(t("themeVerse.saveSuccess"), "📖")
        setIsSheetOpen(false)
        const rows = await getAllThemeVerses(db)
        setItems(rows)
        setSelectedYear(input.year)
      } catch {
        showToast(t("themeVerse.saveFailed"), "⚠️")
      } finally {
        setIsSubmitting(false)
      }
    },
    [appLanguage, db, showToast, t],
  )

  const handleDelete = useCallback(() => {
    if (!selectedItem || !isCurrentYear) return
    Alert.alert(
      replaceToken(t("themeVerse.deleteConfirm"), "year", String(selectedYear)),
      "",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("themeVerse.deleteCurrentYear"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteThemeVerseByYear(db, selectedYear)
              await syncThemeVerseNotificationSchedule(db, { appLanguage })
              showToast(t("themeVerse.deleteSuccess"), "🗑️")
              const rows = await getAllThemeVerses(db)
              setItems(rows)
            } catch {
              showToast(t("themeVerse.deleteFailed"), "⚠️")
            }
          },
        },
      ],
    )
  }, [appLanguage, db, isCurrentYear, selectedItem, selectedYear, showToast, t])

  const citation = selectedItem
    ? `${getBookName(selectedItem.bookCode, appLanguage)} ${selectedItem.chapter}:${formatThemeVerseNumbers(selectedItem.verseNumbers)}`
    : ""

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <ScreenHeader
        title={t("themeVerse.title")}
        onBack={() => router.back()}
        right={
          isCurrentYear ? (
            <Button
              onPress={() => setIsSheetOpen(true)}
              size="md"
              className="rounded-2xl bg-primary-500"
            >
              <ButtonText className="font-semibold text-white dark:text-gray-900">
                {selectedItem
                  ? t("themeVerse.editCurrentYear")
                  : t("themeVerse.setCurrentYear")}
              </ButtonText>
            </Button>
          ) : null
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingBottom: scale(28),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text
            className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400"
            style={{ fontSize: moderateScale(14) }}
          >
            {t("themeVerse.yearSectionTitle")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-center" style={{ gap: scale(8) }}>
              {availableYears.map((year) => {
                const selected = year === selectedYear
                return (
                  <Button
                    key={year}
                    onPress={() => setSelectedYear(year)}
                    size="sm"
                    action={selected ? "primary" : "secondary"}
                    variant={selected ? "solid" : "outline"}
                    className="rounded-full"
                  >
                    <ButtonText>{year}</ButtonText>
                  </Button>
                )
              })}
            </View>
          </ScrollView>
        </View>

        <View className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <View
            className="flex-row items-center justify-between"
            style={{ gap: scale(12) }}
          >
            <Text
              className="text-lg font-bold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(22) }}
            >
              {replaceToken(
                t("themeVerse.summaryLabel"),
                "year",
                String(selectedYear),
              )}
            </Text>
            {isCurrentYear ? (
              <View className="rounded-full bg-primary-100 px-3 py-2 dark:bg-primary-950/40">
                <Text className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                  {t("themeVerse.currentYearBadge")}
                </Text>
              </View>
            ) : null}
          </View>

          {!selectedItem ? (
            <View style={{ marginTop: scale(20) }}>
              <Text
                className="text-base leading-7 text-gray-500 dark:text-gray-400"
                style={{
                  fontSize: moderateScale(16),
                  lineHeight: moderateScale(28),
                }}
              >
                {isCurrentYear
                  ? t("themeVerse.emptyCurrentYear")
                  : t("themeVerse.emptyPastYear")}
              </Text>
              {isCurrentYear ? (
                <Button
                  onPress={() => setIsSheetOpen(true)}
                  className="mt-5 self-start rounded-2xl bg-primary-500"
                >
                  <ButtonText className="font-semibold text-white">
                    {t("themeVerse.setCurrentYear")}
                  </ButtonText>
                </Button>
              ) : null}
            </View>
          ) : (
            <>
              <View className="mt-5">
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("themeVerse.verseLabel")}
                </Text>
                <Text
                  className="mt-2 font-semibold text-primary-600 dark:text-primary-400"
                  style={{ fontSize: moderateScale(15) }}
                >
                  {citation}
                </Text>
                <Text
                  className="mt-3 text-gray-900 dark:text-white"
                  style={{
                    fontSize: moderateScale(18),
                    lineHeight: moderateScale(30),
                  }}
                >
                  {selectedItem.verseText}
                </Text>
              </View>

              <View style={{ marginTop: scale(24) }}>
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("themeVerse.descriptionLabel")}
                </Text>
                <Text
                  className="mt-2 text-gray-700 dark:text-gray-300"
                  style={{
                    fontSize: moderateScale(16),
                    lineHeight: moderateScale(28),
                  }}
                >
                  {selectedItem.description || t("themeVerse.noDescription")}
                </Text>
              </View>

              <View
                className="mt-6 rounded-2xl bg-gray-100 px-4 py-4 dark:bg-gray-800"
                style={{ gap: scale(8) }}
              >
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t("themeVerse.createdAt")}{" "}
                  {formatShortDateTime(selectedItem.createdAt)}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t("themeVerse.updatedAt")}{" "}
                  {formatShortDateTime(selectedItem.updatedAt)}
                </Text>
              </View>
            </>
          )}
        </View>

        {!isCurrentYear ? (
          <Text
            className="mt-4 text-sm text-gray-500 dark:text-gray-400"
            style={{
              fontSize: moderateScale(14),
              lineHeight: moderateScale(22),
            }}
          >
            {t("themeVerse.pastYearLocked")}
          </Text>
        ) : selectedItem ? (
          <Button
            onPress={handleDelete}
            action="negative"
            variant="outline"
            className="mt-5 rounded-2xl border-red-300 bg-transparent dark:border-red-800"
          >
            <ButtonText className="font-semibold text-red-500 dark:text-red-400">
              {t("themeVerse.deleteCurrentYear")}
            </ButtonText>
          </Button>
        ) : null}
      </ScrollView>

      <ThemeVerseSheet
        visible={isSheetOpen}
        year={currentYear}
        initialValue={items.find((item) => item.year === currentYear) ?? null}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setIsSheetOpen(false)
        }}
        onSubmit={handleSave}
      />
    </SafeAreaView>
  )
}
