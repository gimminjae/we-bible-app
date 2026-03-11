import { AdBanner } from "@/components/ads/ad-banner"
import { BibleGrass } from "@/components/bible-grass"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/contexts/toast-context"
import { useResponsive } from "@/hooks/use-responsive"
import {
  claimOnePointFromSteps,
  getClaimedStepUnitsForDateFromDb,
  getPointTotalFromDb,
} from "@/utils/bible-storage"
import { useI18n } from "@/utils/i18n"
import { useFocusEffect } from "@react-navigation/native"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { Pedometer } from "expo-sensors"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function MyPageScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const { showToast } = useToast()
  const { session } = useAuth()
  const { scale, moderateScale } = useResponsive()
  const [pointTotal, setPointTotal] = useState(0)
  const [todaySteps, setTodaySteps] = useState(0)
  const [claimedUnitsToday, setClaimedUnitsToday] = useState(0)
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [pointGuideOpen, setPointGuideOpen] = useState(false)
  const [pointMilestoneOpen, setPointMilestoneOpen] = useState(false)

  const getTodayKey = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = `${now.getMonth() + 1}`.padStart(2, "0")
    const d = `${now.getDate()}`.padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  const welcomeName = useMemo(() => {
    const name = session?.user?.user_metadata?.name
    const emailLocalPart = session?.user?.email?.split("@")[0]
    return (name || emailLocalPart || "").toString()
  }, [session])
  const availableUnits = Math.max(0, Math.floor(todaySteps / 100) - claimedUnitsToday)

  const refreshPointData = useCallback(async () => {
    const todayKey = getTodayKey()
    const [point, claimed] = await Promise.all([
      getPointTotalFromDb(db),
      getClaimedStepUnitsForDateFromDb(db, todayKey),
    ])
    setPointTotal(point)
    setClaimedUnitsToday(claimed)
  }, [db])

  const refreshTodaySteps = useCallback(async () => {
    const available = await Pedometer.isAvailableAsync()
    setIsPedometerAvailable(available)
    if (!available) return

    const permissionApi = Pedometer as unknown as {
      getPermissionsAsync?: () => Promise<{ granted: boolean }>
      requestPermissionsAsync?: () => Promise<{ granted: boolean }>
    }
    if (permissionApi.getPermissionsAsync) {
      const current = await permissionApi.getPermissionsAsync()
      if (!current.granted && permissionApi.requestPermissionsAsync) {
        const requested = await permissionApi.requestPermissionsAsync()
        if (!requested.granted) return
      } else if (!current.granted) {
        return
      }
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const result = await Pedometer.getStepCountAsync(start, new Date())
    setTodaySteps(result.steps)
  }, [])

  useFocusEffect(
    useCallback(() => {
      refreshPointData()
      refreshTodaySteps()
    }, [refreshPointData, refreshTodaySteps])
  )

  const handleClaimPoint = useCallback(async () => {
    if (!isPedometerAvailable) {
      showToast(t("mypage.pointPedometerUnavailable"), "👟")
      return
    }
    if (availableUnits <= 0 || isClaiming) return
    setIsClaiming(true)
    const todayKey = getTodayKey()
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const nextPoint = await claimOnePointFromSteps(db, todayKey)
      setPointTotal(nextPoint)
      setClaimedUnitsToday((prev) => prev + 1)
      showToast("+1포인트", "🎁")
      if (nextPoint > 0 && nextPoint % 10 === 0) {
        setPointMilestoneOpen(true)
      }
    } finally {
      setIsClaiming(false)
    }
  }, [availableUnits, db, isClaiming, isPedometerAvailable, showToast, t])

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(20),
          paddingTop: scale(24),
          paddingBottom: scale(40),
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: moderateScale(24), marginBottom: scale(32) }}
        >
          {t("mypage.title")}
        </Text>
        {welcomeName ? (
          <Text
            className="font-semibold text-primary-600 dark:text-primary-400"
            style={{ fontSize: moderateScale(16), marginBottom: scale(16) }}
          >
            {t("mypage.welcomeUser").replace("{name}", welcomeName)}
          </Text>
        ) : null}

        <Pressable
          onPress={handleClaimPoint}
          disabled={availableUnits <= 0 || isClaiming || !isPedometerAvailable}
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
          style={{
            paddingHorizontal: scale(16),
            paddingVertical: scale(14),
            opacity: availableUnits <= 0 || isClaiming || !isPedometerAvailable ? 0.6 : 1,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: scale(10) }}>
              <IconSymbol name="archivebox.fill" size={moderateScale(22)} color="#d97706" />
              <Text
                className="font-semibold text-amber-700 dark:text-amber-300"
                style={{ fontSize: moderateScale(16) }}
              >
                {t("mypage.pointBoxTitle")}
              </Text>
              <Pressable
                onPress={() => setPointGuideOpen(true)}
                className="p-1 rounded-full active:opacity-80"
              >
                <IconSymbol name="exclamationmark.circle" size={moderateScale(18)} color="#b45309" />
              </Pressable>
            </View>
            <Text
              className="font-bold text-amber-700 dark:text-amber-300"
              style={{ fontSize: moderateScale(18) }}
            >
              {pointTotal}P
            </Text>
          </View>
          <Text className="mt-2 text-amber-700 dark:text-amber-300" style={{ fontSize: moderateScale(13) }}>
            {t("mypage.pointStepsToday").replace("{steps}", String(todaySteps))}
          </Text>
          <Text className="mt-1 text-amber-700 dark:text-amber-300" style={{ fontSize: moderateScale(13) }}>
            {t("mypage.pointCanClaim").replace("{count}", String(availableUnits))}
          </Text>
          <Text
            className="mt-2 font-semibold text-amber-800 dark:text-amber-200"
            style={{ fontSize: moderateScale(14) }}
          >
            {availableUnits > 0 ? t("mypage.pointTapToClaim") : t("mypage.pointNeedMoreSteps")}
          </Text>
        </Pressable>

        <Modal
          visible={pointGuideOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPointGuideOpen(false)}
        >
          <Pressable
            className="flex-1 bg-black/40 justify-center px-5"
            onPress={() => setPointGuideOpen(false)}
          >
            <Pressable
              className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700"
              style={{ paddingHorizontal: scale(16), paddingVertical: scale(16) }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                className="font-bold text-gray-900 dark:text-white"
                style={{ fontSize: moderateScale(18), marginBottom: scale(12) }}
              >
                {t("mypage.pointGuideTitle")}
              </Text>
              <View style={{ gap: scale(10) }}>
                <Text
                  className="text-gray-700 dark:text-gray-300"
                  style={{ fontSize: moderateScale(13), lineHeight: moderateScale(20) }}
                >
                  {t("mypage.pointGuideColorChange")}
                </Text>
                <Text
                  className="text-gray-700 dark:text-gray-300"
                  style={{ fontSize: moderateScale(13), lineHeight: moderateScale(20) }}
                >
                  {t("mypage.pointGuideFillPast")}
                </Text>
              </View>

              <Pressable
                onPress={() => setPointGuideOpen(false)}
                className="mt-4 rounded-xl bg-primary-500 items-center justify-center active:opacity-90"
                style={{ height: scale(44) }}
              >
                <Text className="font-semibold text-white" style={{ fontSize: moderateScale(15) }}>
                  {t("grass.guide.close")}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={pointMilestoneOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPointMilestoneOpen(false)}
        >
          <Pressable
            className="flex-1 bg-black/40 justify-center px-5"
            onPress={() => setPointMilestoneOpen(false)}
          >
            <Pressable
              className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700"
              style={{ paddingHorizontal: scale(16), paddingVertical: scale(16) }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                className="font-bold text-gray-900 dark:text-white"
                style={{ fontSize: moderateScale(18), marginBottom: scale(8) }}
              >
                {t("mypage.pointMilestoneTitle")}
              </Text>
              <Text
                className="text-gray-700 dark:text-gray-300"
                style={{ fontSize: moderateScale(13), marginBottom: scale(12) }}
              >
                {t("mypage.pointMilestoneDesc").replace("{point}", String(pointTotal))}
              </Text>

              <View style={{ marginBottom: scale(12) }}>
                <AdBanner />
              </View>

              <Pressable
                onPress={() => setPointMilestoneOpen(false)}
                className="rounded-xl bg-primary-500 items-center justify-center active:opacity-90"
                style={{ height: scale(44) }}
              >
                <Text className="font-semibold text-white" style={{ fontSize: moderateScale(15) }}>
                  {t("grass.guide.close")}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <BibleGrass onPointTotalChanged={setPointTotal} />

        <View className="mb-4">
          <AdBanner />
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/favorites")}
          className="mb-4 flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{
            paddingHorizontal: scale(16),
            paddingVertical: scale(32),
          }}
        >
          <View className="flex-row items-center" style={{ gap: scale(12) }}>
            <IconSymbol name="heart.fill" size={moderateScale(20)} color="#ec4899" />
            <Text
              style={{ fontSize: moderateScale(16) }}
              className="font-semibold text-gray-900 dark:text-white"
            >
              {t("mypage.favoritesMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/memos")}
          className="mb-4 flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{
            paddingHorizontal: scale(16),
            paddingVertical: scale(32),
          }}
        >
          <View className="flex-row items-center" style={{ gap: scale(12) }}>
            <IconSymbol name="note.text" size={moderateScale(20)} color="#b45309" />
            <Text
              style={{ fontSize: moderateScale(16) }}
              className="font-semibold text-gray-900 dark:text-white"
            >
              {t("mypage.memosMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/prayers")}
          className="mb-4 flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{
            paddingHorizontal: scale(16),
            paddingVertical: scale(32),
          }}
        >
          <View className="flex-row items-center" style={{ gap: scale(12) }}>
            <IconSymbol name="hands.sparkles" size={moderateScale(20)} color="#6366f1" />
            <Text
              style={{ fontSize: moderateScale(16) }}
              className="font-semibold text-gray-900 dark:text-white"
            >
              {t("mypage.prayersMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/plans")}
          className="flex-row items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{
            paddingHorizontal: scale(16),
            paddingVertical: scale(32),
          }}
        >
          <View className="flex-row items-center" style={{ gap: scale(12) }}>
            <IconSymbol name="book.fill" size={moderateScale(20)} color="#059669" />
            <Text
              style={{ fontSize: moderateScale(16) }}
              className="font-semibold text-gray-900 dark:text-white"
            >
              {t("mypage.plansMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={moderateScale(18)} color="#9ca3af" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
