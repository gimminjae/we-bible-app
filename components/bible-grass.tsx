"use client"

import { useFocusEffect } from "@react-navigation/native"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native"

import { AdNativeCard } from "@/components/ads/ad-native-card"
import { useAppSettings } from "@/contexts/app-settings"
import { useToast } from "@/contexts/toast-context"
import { useResponsive } from "@/hooks/use-responsive"
import { getBookName } from "@/services/bible"
import {
  getGrassColorThemeFromDb,
  setGrassColorThemeWithoutPoint,
  type GrassColorTheme,
} from "@/utils/bible-storage"
import { useI18n } from "@/utils/i18n"

import {
  fillGrassByPoint,
  getChapterCountForDate,
  getGrassData,
  getStreakUpToYesterday,
  type GrassDataMap,
  type GrassDayEntry,
} from "@/utils/grass-db"

import { Button, ButtonText } from "@/components/ui/button"
import { IconSymbol } from "@/components/ui/icon-symbol"

/** Sun at top (row 0), then Mon..Sat */
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
]

/** 0=none, 1-4=dark->light */
const GRASS_THEME_COLORS: Record<GrassColorTheme, Record<0 | 1 | 2 | 3 | 4, string>> = {
  green: { 0: "bg-gray-200 dark:bg-gray-700", 1: "bg-emerald-700", 2: "bg-emerald-600", 3: "bg-emerald-500", 4: "bg-emerald-400" },
  yellow: { 0: "bg-gray-200 dark:bg-gray-700", 1: "bg-amber-700", 2: "bg-amber-600", 3: "bg-amber-500", 4: "bg-amber-400" },
  orange: { 0: "bg-gray-200 dark:bg-gray-700", 1: "bg-orange-700", 2: "bg-orange-600", 3: "bg-orange-500", 4: "bg-orange-400" },
  red: { 0: "bg-gray-200 dark:bg-gray-700", 1: "bg-rose-700", 2: "bg-rose-600", 3: "bg-rose-500", 4: "bg-rose-400" },
  blue: { 0: "bg-gray-200 dark:bg-gray-700", 1: "bg-blue-700", 2: "bg-blue-600", 3: "bg-blue-500", 4: "bg-blue-400" },
  purple: { 0: "bg-gray-200 dark:bg-gray-700", 1: "bg-violet-700", 2: "bg-violet-600", 3: "bg-violet-500", 4: "bg-violet-400" },
  sky: { 0: "bg-gray-200 dark:bg-gray-700", 1: "bg-sky-700", 2: "bg-sky-600", 3: "bg-sky-500", 4: "bg-sky-400" },
}

const GRASS_THEME_OPTIONS: GrassColorTheme[] = [
  "green",
  "yellow",
  "orange",
  "red",
  "blue",
  "purple",
  "sky",
]
const REWARD_MODAL_CLOSE_DELAY_SECONDS = 5

function toDateString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 해당 날짜가 속한 주의 일요일 반환 (getDay: 0=Sun, 1=Mon, ...) */
function getSundayBefore(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - day)
  return copy
}

type CellInfo = { dateStr: string; count: number }
type RewardModalAction = "changeColor" | "fillGrass"

/** row 0 = Sunday, row 1 = Mon, ..., row 6 = Sat (일요일 기준 주) */
const ROW_TO_DAY_OFFSET = [0, 1, 2, 3, 4, 5, 6]

function buildGrid(year: number): CellInfo[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const sundayStart = getSundayBefore(yearStart)
  const cols = 53

  const grid: CellInfo[][] = Array(7)
    .fill(null)
    .map(() =>
      Array(cols)
        .fill(null)
        .map(() => ({ dateStr: "", count: 0 })),
    )

  const endDate = year === today.getFullYear() ? today : yearEnd

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < 7; row++) {
      const dayOffset = ROW_TO_DAY_OFFSET[row]
      const cellDate = new Date(sundayStart)
      cellDate.setDate(sundayStart.getDate() + col * 7 + dayOffset)
      if (cellDate > endDate) continue
      if (cellDate >= yearStart && cellDate <= yearEnd) {
        grid[row][col] = { dateStr: toDateString(cellDate), count: -1 }
      }
    }
  }

  return grid
}

/** 각 월 1일이 있는 열(col) 반환. 1월=col, 2월=col, ... */
function getMonthLabels(year: number): { col: number; label: string }[] {
  const sundayStart = getSundayBefore(new Date(year, 0, 1))
  const result: { col: number; label: string }[] = []
  for (let month = 0; month < 12; month++) {
    const firstOfMonth = new Date(year, month, 1)
    const diffMs = firstOfMonth.getTime() - sundayStart.getTime()
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
    const col = Math.floor(diffDays / 7)
    if (col >= 0 && col < 53) {
      result.push({ col, label: MONTH_KEYS[month] })
    }
  }
  return result
}

function getChaptersByYear(
  grassData: GrassDataMap,
  grid: CellInfo[][],
): number {
  let sum = 0
  for (const row of grid) {
    for (const cell of row) {
      if (cell.dateStr) {
        sum += getChapterCountForDate(grassData, cell.dateStr)
      }
    }
  }
  return sum
}

function isFirstOfMonth(dateStr: string): boolean {
  return dateStr.endsWith("-01")
}

/** 열의 실제 left 위치 (monthGap 반영) */
function getColumnLeft(
  colIdx: number,
  grid: CellInfo[][],
  cellSize: number,
  cellGap: number,
  monthGap: number,
): number {
  let left = colIdx * (cellSize + cellGap)
  for (let c = 0; c < colIdx; c++) {
    const hasMonthStart = grid.some((row) =>
      isFirstOfMonth(row[c]?.dateStr ?? ""),
    )
    if (hasMonthStart) left += monthGap
  }
  return left
}

/** 셀을 숨길지: 선택 연도에 없는 날짜만 숨김 */
function shouldHideCell(cell: CellInfo): boolean {
  return !cell.dateStr
}

function formatDateForDetail(dateStr: string): string {
  const [year, month, day] = dateStr.split("-")
  return `${year}.${month}.${day}`
}

/** 연속된 장 번호를 범위로 포맷: [1,2,3,4,5,6] -> "1 ~ 6", [1,2,3,4,7,10] -> "1 ~ 4, 7, 10" */
function formatChapterRanges(chapters: number[]): string {
  if (chapters.length === 0) return ""
  const sorted = [...chapters].sort((a, b) => a - b)
  const parts: string[] = []
  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i]
    } else {
      parts.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart} ~ ${rangeEnd}`)
      rangeStart = sorted[i]
      rangeEnd = sorted[i]
    }
  }
  parts.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart} ~ ${rangeEnd}`)
  return parts.join(", ")
}

/** 날짜별 읽은 성경 포맷: "창세기 1 ~ 6장, 마태복음 1 ~ 4, 7장" */
function formatReadingSummary(
  entries: GrassDayEntry[],
  getBookName: (code: string, lang: string) => string,
  appLanguage: string,
): string {
  return entries
    .map((e) => {
      const name = getBookName(e.bookCode, appLanguage)
      const chStr = formatChapterRanges(e.readChapter)
      return `${name} ${chStr}장`
    })
    .join(", ")
}

function getDetailBodyText(
  dateStr: string,
  grassData: GrassDataMap,
  getBookName: (code: string, lang: string) => string,
  appLanguage: string,
  t: (key: string) => string,
): string {
  if ((grassData[dateStr]?.data.length ?? 0) > 0) {
    return formatReadingSummary(grassData[dateStr].data, getBookName, appLanguage)
  }

  return grassData[dateStr]?.fillYn
    ? t("grass.filledByPointHistory")
    : t("grass.noReadingOnDate")
}

/** 읽은 기록이 있는 날짜 중 최근 n일 (최신순) */
function getRecentDatesWithData(
  grassData: GrassDataMap,
  limit: number,
): string[] {
  return Object.keys(grassData)
    .filter((date) => (grassData[date]?.data.length ?? 0) > 0 || grassData[date]?.fillYn)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
}

function getTodayString(): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function BibleGrass() {
  const db = useSQLiteContext()
  const { t } = useI18n()
  const { showToast } = useToast()
  const { theme, appLanguage } = useAppSettings()
  const { scale, moderateScale, isTablet, dialogMaxWidth } = useResponsive()
  const [grassData, setGrassData] = useState<GrassDataMap>({})
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  )
  const [yearSelectOpen, setYearSelectOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [grassTheme, setGrassTheme] = useState<GrassColorTheme>("green")
  const [rewardModalAction, setRewardModalAction] = useState<RewardModalAction | null>(null)
  const [rewardModalSecondsLeft, setRewardModalSecondsLeft] = useState(0)
  const [rewardModalSubmitting, setRewardModalSubmitting] = useState(false)

  const load = useCallback(() => {
    getGrassData(db).then(setGrassData)
    getGrassColorThemeFromDb(db).then(setGrassTheme)
  }, [db])

  useFocusEffect(load)

  const grid = useMemo(() => buildGrid(selectedYear), [selectedYear])

  const totalChapters = useMemo(
    () => getChaptersByYear(grassData, grid),
    [grid, grassData],
  )

  const { streak, includesYesterday } = useMemo(
    () => getStreakUpToYesterday(grassData, selectedYear),
    [grassData, selectedYear],
  )

  const allYears = useMemo(() => {
    const current = new Date().getFullYear()
    return [current, current - 1, current - 2, current - 3, current - 4]
  }, [])

  const selectableYears = useMemo(() => {
    const result = allYears.filter((y) => {
      const g = buildGrid(y)
      return getChaptersByYear(grassData, g) > 0
    })
    return result
  }, [allYears, grassData])

  useEffect(() => {
    if (selectableYears.length > 0 && !selectableYears.includes(selectedYear)) {
      setSelectedYear(selectableYears[0])
    }
  }, [selectableYears, selectedYear])

  useEffect(() => {
    setSelectedDate(null)
  }, [selectedYear])

  useEffect(() => {
    if (!rewardModalAction) {
      setRewardModalSecondsLeft(0)
      return
    }

    setRewardModalSecondsLeft(REWARD_MODAL_CLOSE_DELAY_SECONDS)
    const countdownId = setInterval(() => {
      setRewardModalSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => clearInterval(countdownId)
  }, [rewardModalAction])

  const monthLabels = useMemo(
    () => getMonthLabels(selectedYear),
    [selectedYear],
  )

  const recentDates = useMemo(
    () => getRecentDatesWithData(grassData, 3),
    [grassData],
  )
  const canFillSelectedDate = useMemo(() => {
    if (!selectedDate) return false
    if (selectedDate >= getTodayString()) return false
    const selected = grassData[selectedDate]
    return (selected?.data.length ?? 0) === 0 && !selected?.fillYn
  }, [grassData, selectedDate])

  const cellSize = isTablet ? 12 : scale(14)
  const cellGap = isTablet ? 2 : scale(3)
  const monthGap = isTablet ? 3 : scale(5)
  const dayLabelWidth = isTablet ? 20 : scale(24)
  const gridWidth = dayLabelWidth + cellGap + 53 * cellSize + 52 * cellGap
  const activeColors = GRASS_THEME_COLORS[grassTheme]

  const pickRandomNextTheme = useCallback((current: GrassColorTheme): GrassColorTheme => {
    const candidates = GRASS_THEME_OPTIONS.filter((option) => option !== current)
    if (!candidates.length) return current
    const randomIdx = Math.floor(Math.random() * candidates.length)
    return candidates[randomIdx]
  }, [])

  const rewardModalClosable = rewardModalSecondsLeft <= 0 && !rewardModalSubmitting
  const rewardModalVisible = rewardModalAction !== null

  const openRewardModal = useCallback((action: RewardModalAction) => {
    setRewardModalSubmitting(false)
    setRewardModalAction(action)
  }, [])

  const performColorChange = useCallback(async () => {
    const nextTheme = pickRandomNextTheme(grassTheme)
    const changed = await setGrassColorThemeWithoutPoint(db, nextTheme)
    if (!changed) return
    setGrassTheme(nextTheme)
    showToast(
      t("grass.colorChangedTo").replace("{color}", t(`grass.color.${nextTheme}`)),
      "🎨",
    )
  }, [db, grassTheme, pickRandomNextTheme, showToast, t])

  const handleChangeColorTheme = useCallback(async () => {
    await performColorChange()
  }, [performColorChange])

  const handlePressChangeColor = useCallback(() => {
    Alert.alert(t("grass.changeColorTitle"), t("grass.changeColorConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: () => {
          openRewardModal("changeColor")
        },
      },
    ])
  }, [openRewardModal, t])

  const performFillGrass = useCallback(async () => {
    if (!selectedDate || !canFillSelectedDate) return
    const filled = await fillGrassByPoint(db, selectedDate)
    if (!filled) return
    load()
    showToast(t("grass.fillSuccess"), "🌱")
  }, [canFillSelectedDate, db, load, selectedDate, showToast, t])

  const handleFillPastGrass = useCallback(async () => {
    if (!selectedDate || !canFillSelectedDate) return
    await performFillGrass()
  }, [canFillSelectedDate, performFillGrass, selectedDate])

  const handlePressFillPastGrass = useCallback(() => {
    if (!selectedDate || !canFillSelectedDate) return
    Alert.alert(t("grass.fillTitle"), t("grass.fillConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: () => {
          openRewardModal("fillGrass")
        },
      },
    ])
  }, [canFillSelectedDate, openRewardModal, selectedDate, t])

  const handleCloseRewardModal = useCallback(async () => {
    if (!rewardModalAction || !rewardModalClosable || rewardModalSubmitting) return

    const nextAction = rewardModalAction
    setRewardModalSubmitting(true)
    setRewardModalAction(null)

    try {
      if (nextAction === "changeColor") {
        await handleChangeColorTheme()
      } else {
        await handleFillPastGrass()
      }
    } finally {
      setRewardModalSubmitting(false)
    }
  }, [handleChangeColorTheme, handleFillPastGrass, rewardModalAction, rewardModalClosable, rewardModalSubmitting])

  const rewardModalTitle =
    rewardModalAction === "fillGrass" ? t("grass.fillTitle") : t("grass.changeColorTitle")
  const rewardModalMessage =
    rewardModalAction === "fillGrass" ? t("grass.fillConfirm") : t("grass.changeColorConfirm")
  const rewardModalCloseLabel = rewardModalClosable
    ? t("grass.rewardModalClose")
    : t("grass.rewardModalCloseLocked").replace("{seconds}", String(rewardModalSecondsLeft))

  return (
    <View
      className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        paddingHorizontal: scale(20),
        paddingVertical: scale(24),
      }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 flex-row items-center pr-2">
          <Text className="text-base text-gray-600 dark:text-gray-400 flex-1">
            {includesYesterday
              ? streak <= 6
                ? t("grass.streakStart")
                : streak <= 30
                  ? t("grass.streakMonth")
                  : t("grass.streakMonthPlus")
              : totalChapters > 0
                ? t("grass.streakStart")
                : t("grass.streakNone")}
          </Text>
          <Pressable
            onPress={() => setGuideOpen(true)}
            className="ml-2 p-1 rounded-full active:opacity-80"
          >
            <IconSymbol
              name="exclamationmark.circle"
              size={moderateScale(18)}
              color={theme === "dark" ? "#9ca3af" : "#6b7280"}
            />
          </Pressable>
        </View>
        <Pressable
          onPress={() => selectableYears.length > 0 && setYearSelectOpen(true)}
          disabled={selectableYears.length === 0}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: scale(8),
            paddingHorizontal: scale(16),
            paddingVertical: scale(10),
            borderRadius: scale(8),
            minWidth: scale(80),
          }}
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <Text
            className={`text-base font-medium ${selectableYears.length === 0 ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"}`}
          >
            {selectedYear}
          </Text>
          <IconSymbol
            name="chevron.down"
            size={moderateScale(16)}
            color={
              selectableYears.length === 0
                ? "#9ca3af"
                : theme === "dark"
                  ? "#9ca3af"
                  : "#6b7280"
            }
          />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: scale(8) }}
      >
        <View style={{ minWidth: gridWidth }}>
          {/* Month row - 각 월 1일 열에 정확히 정렬 */}
          <View
            className="flex-row mb-1"
            style={{
              marginLeft: dayLabelWidth + cellGap,
              height: scale(16),
            }}
          >
            {monthLabels.map(({ col, label }) => (
              <View
                key={`${col}-${label}`}
                style={{
                  position: "absolute",
                  left: getColumnLeft(col, grid, cellSize, cellGap, monthGap),
                  width: scale(32),
                }}
              >
                <Text
                  style={{ fontSize: moderateScale(11) }}
                  className="text-gray-500 dark:text-gray-400"
                >
                  {t(`grass.month.${label}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Day labels + Grid */}
          <View className="flex-row" style={{ gap: cellGap }}>
            <View className="pt-0.5" style={{ width: dayLabelWidth }}>
              {DAY_LABELS.map((label) => (
                <Text
                  key={label}
                  style={{
                    fontSize: moderateScale(11),
                    height: cellSize + cellGap,
                    lineHeight: cellSize + cellGap,
                  }}
                  className="text-gray-500 dark:text-gray-400"
                >
                  {t(`grass.day.${label.toLowerCase()}`)}
                </Text>
              ))}
            </View>
            <View className="flex-row" style={{ gap: cellGap }}>
              {grid[0]?.map((_, colIdx) => {
                const hasMonthStart = grid.some((row) =>
                  isFirstOfMonth(row[colIdx]?.dateStr ?? ""),
                )
                return (
                  <View
                    key={colIdx}
                    style={{ marginLeft: hasMonthStart ? monthGap : 0 }}
                  >
                    <View className="flex-col" style={{ gap: cellGap }}>
                      {grid.map((row, rowIdx) => {
                        const cell = row[colIdx]
                        const hide = shouldHideCell(
                          cell ?? { dateStr: "", count: 0 },
                        )
                        if (hide) {
                          return (
                            <View
                              key={rowIdx}
                              style={{ width: cellSize, height: cellSize }}
                              className="bg-white dark:bg-gray-900 rounded-sm"
                            />
                          )
                        }
                        const count = getChapterCountForDate(
                          grassData,
                          cell!.dateStr,
                        )
                        const filledByPoint = grassData[cell!.dateStr]?.fillYn === true
                        const level =
                          count <= 0
                            ? filledByPoint
                              ? 1
                              : 0
                            : count >= 10
                              ? 4
                              : count >= 5
                                ? 3
                                : count >= 3
                                  ? 2
                                  : 1
                        const dayNum = cell!.dateStr.slice(-2).replace(/^0/, "")
                        const isSelected = selectedDate === cell!.dateStr
                        return (
                          <Pressable
                            key={rowIdx}
                            onPress={() => setSelectedDate(cell!.dateStr)}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: isSelected ? 2 : 0,
                              borderColor: isSelected
                                ? theme === "dark"
                                  ? "#f9fafb"
                                  : "#111827"
                                : "transparent",
                            }}
                            className={`rounded-sm ${activeColors[level as keyof typeof activeColors]}`}
                          >
                            <Text
                              style={{ fontSize: moderateScale(8) }}
                              className={`font-bold ${level === 0 ? "text-gray-600 dark:text-gray-400" : "text-white"}`}
                              numberOfLines={1}
                            >
                              {dayNum}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={yearSelectOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setYearSelectOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setYearSelectOpen(false)}
        >
          <Pressable
            className="bg-gray-50 dark:bg-gray-900 rounded-t-2xl"
            style={{
              width: '100%',
              maxWidth: dialogMaxWidth,
              alignSelf: 'center',
              paddingHorizontal: scale(16),
              paddingBottom: scale(32),
              paddingTop: scale(16),
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="font-semibold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(18), marginBottom: scale(16) }}
            >
              {t("grass.selectYear")}
            </Text>
            {selectableYears.map((y) => (
              <Pressable
                key={y}
                onPress={() => {
                  setSelectedYear(y)
                  setYearSelectOpen(false)
                }}
                className="rounded-xl active:bg-gray-200 dark:active:bg-gray-800"
                style={{ paddingVertical: scale(14) }}
              >
                <Text
                  className={
                    selectedYear === y
                      ? "font-semibold text-primary-600 dark:text-primary-400"
                      : "text-gray-900 dark:text-white"
                  }
                  style={{ fontSize: moderateScale(16) }}
                >
                  {y}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={rewardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <Pressable className="flex-1 bg-black/40 justify-center px-5">
          <Pressable
            className="rounded-3xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            style={{ width: '100%', maxWidth: dialogMaxWidth, alignSelf: 'center', paddingHorizontal: scale(18), paddingVertical: scale(18) }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="font-bold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(18) }}
            >
              {rewardModalTitle}
            </Text>

            <Text
              className="mt-3 text-gray-700 dark:text-gray-300"
              style={{ fontSize: moderateScale(14), lineHeight: moderateScale(22) }}
            >
              {rewardModalMessage}
            </Text>

            <View
              className="mt-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
              style={{ paddingHorizontal: scale(14), paddingVertical: scale(12) }}
            >
              <Text
                className="text-gray-600 dark:text-gray-300"
                style={{ fontSize: moderateScale(13), lineHeight: moderateScale(20) }}
              >
                {t("grass.rewardModalDescription")}
              </Text>
            </View>

            <AdNativeCard className="mt-5" />

            <Pressable
              onPress={() => {
                void handleCloseRewardModal()
              }}
              disabled={!rewardModalClosable}
              className={`mt-3 items-center justify-center rounded-2xl border ${
                rewardModalClosable
                  ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  : "border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
              }`}
              style={{ minHeight: scale(44) }}
            >
              <Text
                className={
                  rewardModalClosable
                    ? "font-medium text-gray-700 dark:text-gray-200"
                    : "font-medium text-gray-400 dark:text-gray-500"
                }
                style={{ fontSize: moderateScale(14) }}
              >
                {rewardModalCloseLabel}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={guideOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGuideOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center px-5"
          onPress={() => setGuideOpen(false)}
        >
          <Pressable
            className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700"
            style={{ width: '100%', maxWidth: dialogMaxWidth, alignSelf: 'center', paddingHorizontal: scale(16), paddingVertical: scale(16) }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              className="font-bold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(18), marginBottom: scale(12) }}
            >
              {t("grass.guide.title")}
            </Text>

            <ScrollView
              style={{ maxHeight: isTablet ? 420 : scale(340) }}
              contentContainerStyle={{ paddingBottom: scale(4) }}
              showsVerticalScrollIndicator
            >
              <View style={{ gap: scale(12) }}>
                <View>
                  <Text
                    className="font-semibold text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(14), marginBottom: scale(4) }}
                  >
                    {t("grass.guide.overviewTitle")}
                  </Text>
                  <Text
                    className="text-gray-700 dark:text-gray-300"
                    style={{ fontSize: moderateScale(13), lineHeight: moderateScale(20) }}
                  >
                    {t("grass.guide.overviewBody")}
                  </Text>
                </View>

                <View>
                  <Text
                    className="font-semibold text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(14), marginBottom: scale(4) }}
                  >
                    {t("grass.guide.sourceTitle")}
                  </Text>
                  <Text
                    className="text-gray-700 dark:text-gray-300"
                    style={{ fontSize: moderateScale(13), lineHeight: moderateScale(20) }}
                  >
                    {t("grass.guide.sourceBody")}
                  </Text>
                </View>

                <View>
                  <Text
                    className="font-semibold text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(14), marginBottom: scale(6) }}
                  >
                    {t("grass.guide.colorTitle")}
                  </Text>
                  <View style={{ gap: scale(6) }}>
                    {([0, 1, 2, 3, 4] as const).map((level) => (
                      <View key={level} className="flex-row items-center" style={{ gap: scale(8) }}>
                        <View
                          style={{ width: cellSize, height: cellSize }}
                          className={`rounded-sm ${activeColors[level as keyof typeof activeColors]}`}
                        />
                        <Text
                          className="text-gray-700 dark:text-gray-300"
                          style={{ fontSize: moderateScale(13) }}
                        >
                          {t(`grass.guide.color${level}`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <Button
              onPress={() => setGuideOpen(false)}
              className="mt-4 rounded-xl bg-primary-500 active:opacity-90"
              style={{ height: scale(44) }}
            >
              <ButtonText className="font-semibold text-white" style={{ fontSize: moderateScale(15) }}>
                {t("grass.guide.close")}
              </ButtonText>
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Legend */}
      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: scale(8) }}>
          <Text
            style={{ fontSize: moderateScale(11) }}
            className="text-gray-500 dark:text-gray-400"
          >
            {t("grass.less")}
          </Text>
          <View className="flex-row gap-0.5">
            {[0, 1, 2, 3, 4].map((level) => (
              <View
                key={level}
                style={{ width: cellSize, height: cellSize }}
                className={`rounded-sm ${activeColors[level as keyof typeof activeColors]}`}
              />
            ))}
          </View>
          <Text
            style={{ fontSize: moderateScale(11) }}
            className="text-gray-500 dark:text-gray-400"
          >
            {t("grass.more")}
          </Text>
        </View>
        <Button
          onPress={handlePressChangeColor}
          action="secondary"
          variant="outline"
          className="h-auto rounded-lg border-gray-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-gray-800"
        >
          <ButtonText
            className="text-gray-700 dark:text-gray-200"
            style={{ fontSize: moderateScale(12) }}
          >
            {t("grass.changeColorButton")}
          </ButtonText>
        </Button>
      </View>

      {/* 날짜별 읽은 성경 */}
      <View
        className="border-t border-gray-200 dark:border-gray-700"
        style={{ marginTop: scale(12), paddingTop: scale(12) }}
      >
        {selectedDate ? (
          <View>
            <Text
              className="font-semibold text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(13), marginBottom: scale(6) }}
            >
              {formatDateForDetail(selectedDate)}
            </Text>
            <Text
              className="text-gray-700 dark:text-gray-300"
              style={{ fontSize: moderateScale(12), lineHeight: moderateScale(18) }}
            >
              {getDetailBodyText(
                selectedDate,
                grassData,
                getBookName,
                appLanguage,
                t,
              )}
            </Text>
            {canFillSelectedDate ? (
              <Button
                onPress={handlePressFillPastGrass}
                action="positive"
                className="mt-3 h-auto self-start rounded-lg bg-emerald-600 px-3 py-2 active:opacity-90"
              >
                <ButtonText className="font-semibold text-white" style={{ fontSize: moderateScale(12) }}>
                  {t("grass.fillButton")}
                </ButtonText>
              </Button>
            ) : null}
          </View>
        ) : recentDates.length > 0 ? (
          <View style={{ gap: scale(10) }}>
            {recentDates.map((dateStr) => (
              <View key={dateStr}>
                <Text
                  className="font-semibold text-gray-900 dark:text-white"
                  style={{ fontSize: moderateScale(13), marginBottom: scale(4) }}
                >
                  {formatDateForDetail(dateStr)}
                </Text>
                <Text
                  className="text-gray-700 dark:text-gray-300"
                  style={{ fontSize: moderateScale(12), lineHeight: moderateScale(18) }}
                >
                  {getDetailBodyText(
                    dateStr,
                    grassData,
                    getBookName,
                    appLanguage,
                    t,
                  )}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-base text-gray-500 dark:text-gray-400">
            {t("grass.noDataYet")}
          </Text>
        )}
      </View>
    </View>
  )
}
