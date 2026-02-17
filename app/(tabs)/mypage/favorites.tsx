import type { FavoriteVerseRecord } from "@/components/bible/types"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { useAppSettings } from "@/contexts/app-settings"
import { useToast } from "@/contexts/toast-context"
import { getBookName } from "@/services/bible"
import { setPendingBibleNavigation } from "@/utils/bible-storage"
import { getAllFavorites, removeFavorites } from "@/utils/favorite-verses-db"
import { useI18n } from "@/utils/i18n"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useState } from "react"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"
import { useResponsive } from "@/hooks/use-responsive"
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
  const { showToast } = useToast()
  const { scale, moderateScale } = useResponsive()
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
            showToast(t("toast.favoriteRemoved"), "❤️")
          },
        },
      ])
    },
    [db, load, showToast, t],
  )

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <View
        className="flex-row items-center"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(12),
          gap: scale(12),
        }}
      >
        <IconSymbol
          name="chevron.right"
          size={moderateScale(18)}
          color="#9ca3af"
          style={{ transform: [{ rotate: "180deg" }] }}
        />
        <Text
          onPress={() => router.back()}
          className="text-gray-700 dark:text-gray-300"
          style={{ fontSize: moderateScale(16) }}
        >
          {t("common.back")}
        </Text>
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: moderateScale(18), marginLeft: scale(8) }}
        >
          {t("mypage.favoritesTitle")}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingBottom: scale(24),
        }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text
            className="text-gray-500 dark:text-gray-400"
            style={{ marginTop: scale(24) }}
          >
            {t("mypage.emptyFavorites")}
          </Text>
        ) : (
          items.map((item, idx) => (
            <View
              key={`${item.bookCode}:${item.chapter}:${item.verse}:${idx}`}
              className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex-row items-start"
              style={{ marginBottom: scale(12) }}
            >
              <Pressable
                onPress={() => handleItemPress(item)}
                className="flex-1 active:opacity-90"
                style={{ paddingHorizontal: scale(16), paddingVertical: scale(12) }}
              >
                <Text
                  className="font-semibold text-primary-600 dark:text-primary-400"
                  style={{ fontSize: moderateScale(14) }}
                >
                  {getBookName(item.bookCode, appLanguage)} {item.chapter}:
                  {item.verse}
                </Text>
                <Text
                  className="text-gray-900 dark:text-white"
                  style={{
                    fontSize: moderateScale(16),
                    lineHeight: moderateScale(24),
                    marginTop: scale(4),
                  }}
                >
                  {item.verseText}
                </Text>
                <Text
                  className="text-gray-500 dark:text-gray-400"
                  style={{ fontSize: moderateScale(14), marginTop: scale(8) }}
                >
                  {formatDate(item.createdAt)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDeletePress(item)}
                hitSlop={scale(8)}
                className="active:bg-gray-100 dark:active:bg-gray-800"
                style={{ padding: scale(12) }}
              >
                <IconSymbol name="trash.fill" size={moderateScale(20)} color="#6b7280" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
