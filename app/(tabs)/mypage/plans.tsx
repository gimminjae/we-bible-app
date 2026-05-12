import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button, ButtonText } from "@/components/ui/button"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { ScreenHeader } from "@/components/ui/screen-header"
import { useAuth } from "@/contexts/auth-context"
import { useMySharedPlans } from "@/hooks/use-churches"
import { formatShortDate } from "@/lib/date"
import { getPlanGoalSummary } from "@/lib/plan"
import { ensurePersistedSlicesHydrated } from "@/lib/sqlite-supabase-store"
import { useI18n } from "@/utils/i18n"
import { getAllPlans, type PlanListItem } from "@/utils/plan-db"

export default function PlanListScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth()
  const [items, setItems] = useState<PlanListItem[]>([])
  const [isLoadingLocal, setIsLoadingLocal] = useState(true)
  const {
    sharedPlans,
    isLoading: isLoadingShared,
    error: sharedPlansError,
  } = useMySharedPlans()

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)))

  const loadLocalPlans = useCallback(() => {
    let active = true
    setIsLoadingLocal(true)

    const loadPlans = async () => {
      if (isAccountDataPending) {
        return
      }

      try {
        if (currentUser && isConfigured) {
          await ensurePersistedSlicesHydrated(db, currentUser.id, ["plans"])
          if (!active) return
        }

        const rows = await getAllPlans(db)
        if (!active) return
        setItems(rows)
      } catch {
        if (active) {
          setItems([])
        }
      } finally {
        if (active) setIsLoadingLocal(false)
      }
    }

    void loadPlans()

    return () => {
      active = false
    }
  }, [currentUser, db, isAccountDataPending, isConfigured])

  useFocusEffect(loadLocalPlans)

  if (sharedPlansError) {
    return <LoadingScreen message={sharedPlansError.message} />
  }

  if (isLoadingLocal || isLoadingShared) {
    return <LoadingScreen message="Loading plans..." />
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <ScreenHeader
        title={t("mypage.plansTitle")}
        onBack={() => router.back()}
        right={
          <Button
            onPress={() => router.push("/(tabs)/mypage/plan/templates")}
            className="h-auto rounded-xl bg-primary-500 px-4 py-3"
          >
            <ButtonText className="font-semibold text-white dark:text-gray-900">
              {t("mypage.addPlan")}
            </ButtonText>
          </Button>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t("mypage.personalPlansSection")}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {items.length}
            </Text>
          </View>

          {items.length === 0 ? (
            <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t("mypage.emptyPlans")}
              </Text>
            </View>
          ) : (
            items.map((item) => {
              const summary = getPlanGoalSummary(item.selectedBookCodes)
              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/mypage/plan/[id]",
                      params: { id: String(item.id) },
                    })
                  }
                  className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                >
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.planName || t("mypage.planDetailTitle")}
                      </Text>
                      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {summary.oldTestament > 0
                          ? `${t("bibleDrawer.oldTestament")} ${summary.oldTestament}`
                          : ""}
                        {summary.oldTestament > 0 && summary.newTestament > 0
                          ? " · "
                          : ""}
                        {summary.newTestament > 0
                          ? `${t("bibleDrawer.newTestament")} ${summary.newTestament}`
                          : ""}
                      </Text>
                      {item.planDescription ? (
                        <Text
                          className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400"
                          numberOfLines={2}
                        >
                          {item.planDescription}
                        </Text>
                      ) : null}
                    </View>
                    <View className="rounded-2xl bg-primary-100 px-3 py-2 dark:bg-primary-950/40">
                      <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {item.goalPercent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {t("mypage.planStartDate")}{" "}
                    {formatShortDate(item.startDate)} ·{" "}
                    {t("mypage.planEndDate")} {formatShortDate(item.endDate)}
                  </Text>
                  <Text className="mt-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                    {item.restDay} {t("mypage.planDaysRemaining")}
                  </Text>
                </Pressable>
              )
            })
          )}
        </View>

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t("mypage.sharedPlansSection")}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {sharedPlans.length}
            </Text>
          </View>

          {sharedPlans.length === 0 ? (
            <View className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-10 dark:border-gray-800 dark:bg-gray-900">
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t("mypage.emptySharedPlans")}
              </Text>
            </View>
          ) : (
            sharedPlans.map((plan) => (
              <Pressable
                key={plan.id}
                onPress={() =>
                  router.push(
                    `/churches/${plan.churchId}/plans/${plan.id}` as never,
                  )
                }
                className="mb-3 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {plan.planName || t("church.planDetailTitle")}
                    </Text>
                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {plan.churchName}
                    </Text>
                    {plan.planDescription ? (
                      <Text
                        className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400"
                        numberOfLines={2}
                      >
                        {plan.planDescription}
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {plan.teamName
                        ? t("church.teamPlanScope").replace(
                            "{team}",
                            plan.teamName,
                          )
                        : t("church.churchPlanScope")}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {plan.startDate} ~ {plan.endDate}
                    </Text>
                  </View>
                  <View className="rounded-2xl bg-primary-100 px-3 py-2 dark:bg-primary-950/40">
                    <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {plan.myGoalPercent?.toFixed(1) ?? "0.0"}%
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between gap-3">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {t("church.planCreatedBy").replace(
                      "{name}",
                      plan.createdByName,
                    )}
                  </Text>
                  <Text className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {plan.averageGoalPercent.toFixed(1)}%
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
