import { BibleGrass } from "@/components/bible-grass"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { useI18n } from "@/utils/i18n"
import { useRouter } from "expo-router"
import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function MyPageScreen() {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          {t("mypage.title")}
        </Text>

        <BibleGrass />

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/favorites")}
          className="mb-4 px-4 py-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <IconSymbol name="heart.fill" size={20} color="#ec4899" />
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t("mypage.favoritesMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/memos")}
          className="mb-4 px-4 py-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <IconSymbol name="note.text" size={20} color="#b45309" />
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t("mypage.memosMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/prayers")}
          className="mb-4 px-4 py-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <IconSymbol name="hands.sparkles" size={20} color="#6366f1" />
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t("mypage.prayersMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/mypage/plans")}
          className="px-4 py-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <IconSymbol name="book.fill" size={20} color="#059669" />
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {t("mypage.plansMenu")}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#9ca3af" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
