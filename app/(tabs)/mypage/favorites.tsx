import type { FavoriteVerseRecord } from "@/components/bible/types"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { useAppSettings } from "@/contexts/app-settings"
import { getBookName } from "@/services/bible"
import { setPendingBibleNavigation } from "@/utils/bible-storage"
import { getAllFavorites, removeFavorites } from "@/utils/favorite-verses-db"
import { useI18n } from "@/utils/i18n"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useState } from "react"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

function formatDate(raw: string): string {
  if (!raw) return "-"
  const [date, time = ""] = raw.split(" ")
  const [y = "", m = "", d = ""] = date.split("-")
  const hm = time.slice(0, 5)
  return `${y}.${m}.${d} ${hm}`.trim()
}

export default function FavoriteListScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const { appLanguage } = useAppSettings()
  const [items, setItems] = useState<FavoriteVerseRecord[]>([])

  const load = useCallback(() => {
    let active = true
    getAllFavorites(db).then((rows) => {
      if (!active) return
      setItems(rows)
    })
    return () => {
      active = false
    }
  }, [db])

  useFocusEffect(load)

  const handleItemPress = useCallback(
    (item: FavoriteVerseRecord) => {
      Alert.alert(t("mypage.goToVerse"), "", [
        { text: t("mypage.goToVerseCancel"), style: "cancel" },
        {
          text: t("mypage.goToVerseConfirm"),
          onPress: async () => {
            await setPendingBibleNavigation(db, {
              bookCode: item.bookCode,
              chapter: item.chapter,
            })
            router.replace("/(tabs)")
          },
        },
      ])
    },
    [db, router, t],
  )

  const handleDeletePress = useCallback(
    (item: FavoriteVerseRecord) => {
      Alert.alert(t("mypage.deleteFavoriteConfirm"), "", [
        { text: t("mypage.deleteCancel"), style: "cancel" },
        {
          text: t("mypage.deleteConfirm"),
          style: "destructive",
          onPress: async () => {
            await removeFavorites(db, item.bookCode, item.chapter, [item.verse])
            load()
          },
        },
      ])
    },
    [db, load, t],
  )

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <View className="px-4 pt-4 pb-3 flex-row items-center gap-3">
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
          {t("mypage.favoritesTitle")}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400 mt-6">
            {t("mypage.emptyFavorites")}
          </Text>
        ) : (
          items.map((item, idx) => (
            <View
              key={`${item.bookCode}:${item.chapter}:${item.verse}:${idx}`}
              className="mb-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-row items-start"
            >
              <Pressable
                onPress={() => handleItemPress(item)}
                className="flex-1 px-4 py-3 active:opacity-90"
              >
                <Text className="font-semibold text-sm text-primary-600 dark:text-primary-400 font-medium">
                  {getBookName(item.bookCode, appLanguage)} {item.chapter}:
                  {item.verse}
                </Text>
                <Text className="text-base text-gray-900 dark:text-white leading-6 mt-1">
                  {item.verseText}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {formatDate(item.createdAt)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDeletePress(item)}
                hitSlop={8}
                className="p-3 active:bg-gray-100 dark:active:bg-gray-800"
              >
                <IconSymbol name="trash.fill" size={20} color="#6b7280" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
