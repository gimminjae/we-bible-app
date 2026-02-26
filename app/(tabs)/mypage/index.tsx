import { BibleGrass } from "@/components/bible-grass"
import { useAuth } from "@/contexts/auth-context"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { useResponsive } from "@/hooks/use-responsive"
import { useI18n } from "@/utils/i18n"
import { useMemo } from "react"
import { useRouter } from "expo-router"
import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function MyPageScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const { session } = useAuth()
  const { scale, moderateScale } = useResponsive()
  const welcomeName = useMemo(() => {
    const name = session?.user?.user_metadata?.name
    const emailLocalPart = session?.user?.email?.split("@")[0]
    return (name || emailLocalPart || "").toString()
  }, [session])

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

        <BibleGrass />

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
