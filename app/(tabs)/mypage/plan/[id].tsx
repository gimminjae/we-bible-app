import { BottomSheet } from "@/components/ui/bottom-sheet"
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { EditableChapterReadCountGrid } from "@/components/plans/editable-chapter-read-count-grid"
import { useAppSettings } from "@/contexts/app-settings"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/contexts/toast-context"
import { useLoading } from "@/hooks/use-loading"
import {
  countReadChapters,
  formatReadCountBadge,
  isChapterRead,
  normalizeChapterReadCount,
} from "@/lib/plan"
import { ensurePersistedSlicesHydrated } from "@/lib/sqlite-supabase-store"
import { getBookName } from "@/services/bible"
import { useI18n } from "@/utils/i18n"
import {
  BIBLE_BOOKS,
  deletePlan,
  getPlanById,
  type GoalStatus,
  type PlanRecord,
} from "@/utils/plan-db"
import { useFocusEffect } from "@react-navigation/native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const OT_BOOKS = BIBLE_BOOKS.filter((b) => b.bookSeq <= 39)
const NT_BOOKS = BIBLE_BOOKS.filter((b) => b.bookSeq >= 40)

function BookChapterSection({
  book,
  bookIndex,
  plan,
  appLanguage,
  onChapterPress,
  getBookName,
}: {
  book: (typeof BIBLE_BOOKS)[0]
  bookIndex: number
  plan: PlanRecord
  appLanguage: string
  onChapterPress: (bookIndex: number) => void
  getBookName: (code: string, lang: string) => string
}) {
  const chapters = plan.goalStatus[bookIndex] ?? []
  const readCount = countReadChapters(chapters)
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {getBookName(book.bookCode, appLanguage)} ({readCount}/{book.maxChapter}
        )
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {Array.from({ length: book.maxChapter }, (_, i) => i + 1).map((ch) => {
          const chapterReadCount = normalizeChapterReadCount(chapters[ch - 1])
          const isRead = isChapterRead(chapterReadCount)
          return (
            <View key={ch} className="relative">
              <Button
                onPress={() => onChapterPress(bookIndex)}
                action={isRead ? "positive" : "secondary"}
                variant={isRead ? "solid" : "outline"}
                size="xs"
                className="w-10 h-10 rounded-full p-0 min-h-0"
              >
                <ButtonText className="text-xs font-medium">{ch}</ButtonText>
              </Button>
              {chapterReadCount > 0 ? (
                <View className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primary-500 px-1 py-0.5 items-center">
                  <Text className="text-[10px] font-bold text-white">
                    {formatReadCountBadge(chapterReadCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function PlanDetailScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const { appLanguage } = useAppSettings()
  const { showToast } = useToast()
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth()
  const params = useLocalSearchParams<{ id?: string }>()
  const planId = useMemo(() => Number(params.id || 0), [params.id])
  const [plan, setPlan] = useState<PlanRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"ot" | "nt">("ot")
  const [chapterModalBookIndex, setChapterModalBookIndex] = useState<
    number | null
  >(null)

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)))

  const load = useCallback(() => {
    let active = true
    if (!planId) {
      setPlan(null)
      setLoading(false)
      return
    }
    setLoading(true)

    const loadPlan = async () => {
      if (isAccountDataPending) {
        return
      }

      try {
        if (currentUser && isConfigured) {
          await ensurePersistedSlicesHydrated(db, currentUser.id, ["plans"])
          if (!active) return
        }

        const row = await getPlanById(db, planId)
        if (!active) return
        setPlan(row)
      } catch {
        if (active) {
          setPlan(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadPlan()

    return () => {
      active = false
    }
  }, [currentUser, db, isAccountDataPending, isConfigured, planId])

  useFocusEffect(load)

  const handleDelete = useCallback(() => {
    if (!plan) return
    Alert.alert(t("mypage.deletePlanConfirm"), "", [
      { text: t("mypage.deleteCancel"), style: "cancel" },
      {
        text: t("mypage.deleteConfirm"),
        style: "destructive",
        onPress: async () => {
          await deletePlan(db, plan.id)
          showToast(t("toast.planDeleted"), "📖")
          router.back()
        },
      },
    ])
  }, [db, plan, router, showToast, t])

  const handleEditPress = useCallback(() => {
    router.push({
      pathname: "/(tabs)/mypage/plan/[id]/edit",
      params: { id: String(planId) },
    })
  }, [router, planId])

  const selectedOtBooks = useMemo(
    () =>
      plan
        ? OT_BOOKS.filter((b) => plan.selectedBookCodes.includes(b.bookCode))
        : [],
    [plan],
  )
  const selectedNtBooks = useMemo(
    () =>
      plan
        ? NT_BOOKS.filter((b) => plan.selectedBookCodes.includes(b.bookCode))
        : [],
    [plan],
  )

  if (!plan) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        edges={["top", "bottom", "left", "right"]}
      >
        <View className="flex-1 items-center justify-center p-4">
          {loading ? (
            <ActivityIndicator size="large" color="#6b7280" />
          ) : (
            <Text className="text-center text-gray-500 dark:text-gray-400">
              {t("mypage.planNotFound")}
            </Text>
          )}
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <IconSymbol
            name="chevron.right"
            size={18}
            color="#9ca3af"
            style={{ transform: [{ rotate: "180deg" }] }}
          />
          <Text
            onPress={() => router.back()}
            className="text-base text-gray-700 dark:text-gray-300"
          >
            {t("common.back")}
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">
            {plan.planName}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Button onPress={handleEditPress} action="primary" size="sm">
            <ButtonText>{t("mypage.editPlan")}</ButtonText>
          </Button>
          <Button onPress={handleDelete} action="negative" size="sm">
            <ButtonText>{t("mypage.deletePlan")}</ButtonText>
          </Button>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 기간 */}
        <View className="mt-4 mb-4 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t("mypage.planPeriod")}
          </Text>
          <Text className="text-base text-gray-900 dark:text-white">
            {plan.startDate} ~ {plan.endDate}
          </Text>
          <Text className="text-sm text-primary-600 dark:text-primary-400 mt-2">
            {plan.restDay} {t("mypage.planDaysRemaining")}
          </Text>
        </View>

        {plan.planDescription ? (
          <View className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <Text className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('planDrawer.planDescriptionLabel')}
            </Text>
            <Text className="text-base leading-7 text-gray-900 dark:text-white">
              {plan.planDescription}
            </Text>
          </View>
        ) : null}

        {/* 목표 */}
        <View className="mb-4 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t("mypage.planGoal")}
          </Text>
          <Text className="text-base text-gray-900 dark:text-white">
            {plan.selectedBookCodes.length}권, 총 {plan.totalReadCount}장
          </Text>
        </View>

        {/* 진행도 */}
        <View className="mb-4 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t("mypage.planProgress")}
          </Text>
          <View className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <View
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${Math.min(100, plan.goalPercent)}%` }}
            />
          </View>
          <Text className="text-base font-semibold text-primary-600 dark:text-primary-400 mt-2">
            {plan.goalPercent.toFixed(2)}%
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("mypage.planChaptersPerDay").replace(
              "{count}",
              plan.readCountPerDay.toFixed(2),
            )}
          </Text>
        </View>

        {/* 구약/신약 탭 */}
        <View className="flex-row border-b border-gray-200 dark:border-gray-700 mb-4">
          {(["ot", "nt"] as const).map((tab) => {
            const isActive = activeTab === tab
            return (
              <Button
                key={tab}
                onPress={() => setActiveTab(tab)}
                action={isActive ? "primary" : "secondary"}
                variant="link"
                className={`h-auto flex-1 rounded-none border-b-2 py-3 ${
                  isActive ? "border-primary-500" : "border-transparent"
                }`}
              >
                <ButtonText
                  className={`text-base font-medium ${
                    isActive
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {tab === "ot"
                    ? t("bibleDrawer.oldTestament")
                    : t("bibleDrawer.newTestament")}
                </ButtonText>
              </Button>
            )
          })}
        </View>

        {/* 탭별 성경 목록 */}
        {activeTab === "ot" && (
          <>
            {selectedOtBooks.length > 0 ? (
              selectedOtBooks.map((book) => {
                const bookIndex = BIBLE_BOOKS.findIndex(
                  (x) => x.bookCode === book.bookCode,
                )
                return (
                  <BookChapterSection
                    key={book.bookCode}
                    book={book}
                    bookIndex={bookIndex}
                    plan={plan}
                    appLanguage={appLanguage}
                    onChapterPress={setChapterModalBookIndex}
                    getBookName={getBookName}
                  />
                )
              })
            ) : (
              <Text className="text-gray-500 dark:text-gray-400 text-center py-8">
                {t("mypage.planNoSelectedBooks")}
              </Text>
            )}
          </>
        )}
        {activeTab === "nt" && (
          <>
            {selectedNtBooks.length > 0 ? (
              selectedNtBooks.map((book) => {
                const bookIndex = BIBLE_BOOKS.findIndex(
                  (x) => x.bookCode === book.bookCode,
                )
                return (
                  <BookChapterSection
                    key={book.bookCode}
                    book={book}
                    bookIndex={bookIndex}
                    plan={plan}
                    appLanguage={appLanguage}
                    onChapterPress={setChapterModalBookIndex}
                    getBookName={getBookName}
                  />
                )
              })
            ) : (
              <Text className="text-gray-500 dark:text-gray-400 text-center py-8">
                {t("mypage.planNoSelectedBooks")}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {chapterModalBookIndex !== null && plan && (
        <ChapterEditDrawer
          visible={chapterModalBookIndex !== null}
          onClose={() => setChapterModalBookIndex(null)}
          plan={plan}
          bookIndex={chapterModalBookIndex}
          db={db}
          appLanguage={appLanguage}
          onSaved={() => {
            load()
            setChapterModalBookIndex(null)
          }}
          t={t}
        />
      )}
    </SafeAreaView>
  )
}

type ChapterEditDrawerProps = {
  visible: boolean
  onClose: () => void
  plan: PlanRecord
  bookIndex: number
  db: SQLiteDatabase
  appLanguage: string
  onSaved: () => void
  t: (key: string) => string
}

function ChapterEditDrawer({
  visible,
  onClose,
  plan,
  bookIndex,
  db,
  appLanguage,
  onSaved,
  t,
}: ChapterEditDrawerProps) {
  const [localStatus, setLocalStatus] = useState<GoalStatus>(plan.goalStatus.map((row) => [...row]))
  const { isLoading, runWithLoading } = useLoading()

  useEffect(() => {
    if (visible && plan) {
      setLocalStatus(plan.goalStatus.map((row) => [...row]))
    }
  }, [visible, plan, bookIndex])

  const book = BIBLE_BOOKS[bookIndex]
  if (!book) return null

  const chapters = Array.from(
    { length: book.maxChapter },
    (_entry, chapterIndex) => normalizeChapterReadCount(localStatus[bookIndex]?.[chapterIndex]),
  )

  const updateChapterCount = (chIndex: number, updater: (current: number) => number) => {
    setLocalStatus((prev) => {
      const next = prev.map((row, i) => {
        if (i !== bookIndex) return row
        const arr = Array.from(
          { length: book.maxChapter },
          (_entry, chapterIndex) => normalizeChapterReadCount(row[chapterIndex]),
        )
        if (chIndex >= 0 && chIndex < arr.length) {
          arr[chIndex] = Math.max(0, normalizeChapterReadCount(updater(arr[chIndex] ?? 0)))
        }
        return arr
      })
      return next
    })
  }

  const incrementChapter = (chIndex: number) => {
    updateChapterCount(chIndex, (current) => current + 1)
  }

  const decrementChapter = (chIndex: number) => {
    updateChapterCount(chIndex, (current) => current - 1)
  }

  const checkAll = () => {
    const allRead = chapters.every((count) => isChapterRead(count))
    setLocalStatus((prev) => {
      const next = prev.map((row, i) =>
        i === bookIndex
          ? Array.from({ length: book.maxChapter }, (_entry, chapterIndex) => {
              const current = normalizeChapterReadCount(row[chapterIndex])
              if (allRead) return 0
              return isChapterRead(current) ? current : 1
            })
          : row,
      )
      return next
    })
  }

  const handleSave = async () => {
    await runWithLoading(async () => {
      const { updateGoalStatus } = await import("@/utils/plan-db")
      const { syncGrassFromPlanSave } = await import("@/utils/grass-db")
      await updateGoalStatus(db, plan.id, localStatus)
      await syncGrassFromPlanSave(
        db,
        book.bookCode,
        plan.goalStatus[bookIndex] ?? [],
        localStatus[bookIndex] ?? [],
      )
      onSaved()
    })
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        if (isLoading) return
        onClose()
      }}
      heightFraction={0.8}
    >
      <View className="px-6 py-3 flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {getBookName(book.bookCode, appLanguage)}
        </Text>
        <Button
          onPress={onClose}
          disabled={isLoading}
          action="secondary"
          variant="link"
          className="h-auto px-2 py-1"
        >
          <ButtonText className="text-base text-gray-600 dark:text-gray-400">✕</ButtonText>
        </Button>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 16,
        }}
      >
        <EditableChapterReadCountGrid
          maxChapter={book.maxChapter}
          chapters={chapters}
          onIncrement={incrementChapter}
          onDecrement={decrementChapter}
          disabled={isLoading}
        />
      </ScrollView>
      <View className="px-6 pb-6 pt-2 flex-row gap-3">
        <Button
          onPress={handleSave}
          disabled={isLoading}
          action="primary"
          className="flex-1"
        >
          {isLoading ? <ButtonSpinner color="#ffffff" /> : null}
          <ButtonText>{t("mypage.savePlan")}</ButtonText>
        </Button>
        <Button onPress={checkAll} disabled={isLoading} action="secondary" className="flex-1">
          <ButtonText>{t("mypage.checkAll")}</ButtonText>
        </Button>
      </View>
    </BottomSheet>
  )
}
