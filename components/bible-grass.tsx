"use client"

import { useFocusEffect } from "@react-navigation/native"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, Text, View } from "react-native"

import { useAppSettings } from "@/contexts/app-settings"
import { useI18n } from "@/utils/i18n"

import {
  getChapterCountForDate,
  getGrassData,
  type GrassDataMap,
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

export function BibleGrass() {
  const db = useSQLiteContext()
  const { t } = useI18n()
  const { theme } = useAppSettings()
  const [grassData, setGrassData] = useState<GrassDataMap>({})
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  )
  const [yearSelectOpen, setYearSelectOpen] = useState(false)

  const load = useCallback(() => {
    getGrassData(db).then(setGrassData)
  }, [db])

  useFocusEffect(load)

  const grid = useMemo(() => buildGrid(selectedYear), [selectedYear])

  const totalChapters = useMemo(
    () => getChaptersByYear(grassData, grid),
    [grid, grassData],
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
    return [...result, 2025, 2024]
  }, [allYears, grassData])

  useEffect(() => {
    if (selectableYears.length > 0 && !selectableYears.includes(selectedYear)) {
      setSelectedYear(selectableYears[0])
    }
  }, [selectableYears, selectedYear])

  const monthLabels = useMemo(
    () => getMonthLabels(selectedYear),
    [selectedYear],
  )

  const cellSize = 12
  const cellGap = 2
  const monthGap = 4
  const dayLabelWidth = 20
  const gridWidth = dayLabelWidth + cellGap + 53 * cellSize + 52 * cellGap

  return (
    <View className="mb-6 px-4 py-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm text-gray-600 dark:text-gray-400 flex-1">
          {t("grass.title").replace("{count}", String(totalChapters))}
        </Text>
        <Pressable
          onPress={() =>
            selectableYears.length > 0 && setYearSelectOpen(true)
          }
          disabled={selectableYears.length === 0}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-w-[72px]"
        >
          <Text
            className={`text-sm font-medium ${selectableYears.length === 0 ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"}`}
          >
            {selectedYear}
          </Text>
          <IconSymbol
            name="chevron.down"
            size={14}
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
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        <View style={{ minWidth: gridWidth }}>
          {/* Month row - 각 월 1일 열에 정확히 정렬 */}
          <View
            className="flex-row mb-1"
            style={{ marginLeft: dayLabelWidth + cellGap, height: 14 }}
          >
            {monthLabels.map(({ col, label }) => (
              <View
                key={`${col}-${label}`}
                style={{
                  position: "absolute",
                  left: getColumnLeft(col, grid, cellSize, cellGap, monthGap),
                  width: 28,
                }}
              >
                <Text className="text-[10px] text-gray-500 dark:text-gray-400">
                  {t(`grass.month.${label}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Day labels + Grid */}
          <View className="flex-row" style={{ gap: cellGap }}>
            <View className="pt-0.5" style={{ width: 20 }}>
              {DAY_LABELS.map((label) => (
                <Text
                  key={label}
                  className="text-[10px] text-gray-500 dark:text-gray-400"
                  style={{
                    height: cellSize + cellGap,
                    lineHeight: cellSize + cellGap,
                  }}
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
                          <View
                            key={rowIdx}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            className={`rounded-sm ${GRASS_COLORS[level as keyof typeof GRASS_COLORS]}`}
                          >
                            <Text
                              className={`text-[7px] font-bold ${level === 0 ? "text-gray-600 dark:text-gray-400" : "text-white"}`}
                              numberOfLines={1}
                            >
                              {dayNum}
                            </Text>
                          </View>
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
            className="bg-gray-50 dark:bg-gray-900 rounded-t-2xl px-4 pb-8 pt-4"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("grass.selectYear")}
            </Text>
            {selectableYears.map((y) => (
              <Pressable
                key={y}
                onPress={() => {
                  setSelectedYear(y)
                  setYearSelectOpen(false)
                }}
                className="py-3.5 rounded-xl active:bg-gray-200 dark:active:bg-gray-800"
              >
                <Text
                  className={`text-base ${selectedYear === y ? "font-semibold text-primary-600 dark:text-primary-400" : "text-gray-900 dark:text-white"}`}
                >
                  {y}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Legend */}
      <View className="flex-row items-center gap-2 mt-3">
        <Text className="text-[10px] text-gray-500 dark:text-gray-400">
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
        <Text className="text-[10px] text-gray-500 dark:text-gray-400">
          {t("grass.more")}
        </Text>
      </View>
    </View>
  )
}
