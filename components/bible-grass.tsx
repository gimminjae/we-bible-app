"use client"

import { useFocusEffect } from "@react-navigation/native"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, Text, View } from "react-native"

import { useAppSettings } from "@/contexts/app-settings"
import { useResponsive } from "@/hooks/use-responsive"
import { getBookName } from "@/services/bible"
import { useI18n } from "@/utils/i18n"

import {
  getChapterCountForDate,
  getGrassData,
  getStreakUpToYesterday,
  type GrassDataMap,
  type GrassDayEntry,
} from "@/utils/grass-db"

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

/** GitHub-style colors: 0=none, 1-4=green intensity */
const GRASS_COLORS = {
  0: "bg-gray-200 dark:bg-gray-700",
  1: "bg-emerald-600",
  2: "bg-emerald-500",
  3: "bg-emerald-400",
  4: "bg-emerald-300",
}

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

/** YYYY-MM-DD → "2월 16일" (ko) / "Feb 16" (en) */
function formatDateForDisplay(
  dateStr: string,
  t: (key: string) => string,
): string {
  const [, m, d] = dateStr.split("-").map(Number)
  const monthKey = MONTH_KEYS[m - 1]
  return `${t(`grass.month.${monthKey}`)} ${d}${t("grass.daySuffix")}`
}

/** 날짜별 읽은 성경 포맷: "창세기 1,2장, 마태복음 3장" */
function formatReadingSummary(
  entries: GrassDayEntry[],
  getBookName: (code: string, lang: string) => string,
  appLanguage: string,
): string {
  return entries
    .map((e) => {
      const name = getBookName(e.bookCode, appLanguage)
      const chStr = [...e.readChapter].sort((a, b) => a - b).join(",")
      return `${name} ${chStr}장`
    })
    .join(", ")
}

/** 읽은 기록이 있는 날짜 중 최근 n일 (최신순) */
function getRecentDatesWithData(
  grassData: GrassDataMap,
  limit: number,
): string[] {
  return Object.keys(grassData)
    .filter((date) => grassData[date]?.length > 0)
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
  const { theme, appLanguage } = useAppSettings()
  const { scale, moderateScale } = useResponsive()
  const [grassData, setGrassData] = useState<GrassDataMap>({})
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  )
  const [yearSelectOpen, setYearSelectOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const load = useCallback(() => {
    getGrassData(db).then(setGrassData)
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

  const monthLabels = useMemo(
    () => getMonthLabels(selectedYear),
    [selectedYear],
  )

  const recentDates = useMemo(
    () => getRecentDatesWithData(grassData, 3),
    [grassData],
  )

  const cellSize = scale(14)
  const cellGap = scale(3)
  const monthGap = scale(5)
  const dayLabelWidth = scale(24)
  const gridWidth = dayLabelWidth + cellGap + 53 * cellSize + 52 * cellGap

  return (
    <View
      className="mb-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        paddingHorizontal: scale(20),
        paddingVertical: scale(24),
      }}
    >
      <View className="flex-row items-center justify-between mb-3">
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
                        const level = count <= 0 ? 0 : count >= 4 ? 4 : count
                        const dayNum = cell!.dateStr.slice(-2).replace(/^0/, "")
                        return (
                          <Pressable
                            key={rowIdx}
                            onPress={() => setSelectedDate(cell!.dateStr)}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            className={`rounded-sm ${GRASS_COLORS[level as keyof typeof GRASS_COLORS]}`}
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

      {/* Legend */}
      <View className="flex-row items-center mt-3" style={{ gap: scale(8) }}>
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
              className={`rounded-sm ${GRASS_COLORS[level as keyof typeof GRASS_COLORS]}`}
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

      {/* 날짜별 읽은 성경 */}
      <View
        className="border-t border-gray-200 dark:border-gray-700"
        style={{ marginTop: scale(12), paddingTop: scale(12) }}
      >
        {selectedDate ? (
          <Text
            className="text-gray-700 dark:text-gray-300"
            style={{ fontSize: moderateScale(12) }}
          >
            {grassData[selectedDate] && grassData[selectedDate].length > 0
              ? selectedDate === getTodayString()
                ? t("grass.todayReadFormat").replace(
                    "{books}",
                    formatReadingSummary(
                      grassData[selectedDate],
                      getBookName,
                      appLanguage,
                    ),
                  )
                : t("grass.dateReadFormat")
                    .replace("{date}", formatDateForDisplay(selectedDate, t))
                    .replace(
                      "{books}",
                      formatReadingSummary(
                        grassData[selectedDate],
                        getBookName,
                        appLanguage,
                      ),
                    )
              : t("grass.noReadingOnDate")}
          </Text>
        ) : recentDates.length > 0 ? (
          <View style={{ gap: scale(10) }}>
            {recentDates.map((dateStr) => (
              <Text
                key={dateStr}
                className="text-gray-700 dark:text-gray-300"
                style={{ fontSize: moderateScale(12) }}
              >
                {dateStr === getTodayString()
                  ? t("grass.todayReadFormat").replace(
                      "{books}",
                      formatReadingSummary(
                        grassData[dateStr],
                        getBookName,
                        appLanguage,
                      ),
                    )
                  : t("grass.dateReadFormat")
                      .replace("{date}", formatDateForDisplay(dateStr, t))
                      .replace(
                        "{books}",
                        formatReadingSummary(
                          grassData[dateStr],
                          getBookName,
                          appLanguage,
                        ),
                      )}
              </Text>
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
