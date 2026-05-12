import type { FavoriteVerseRecord } from "@/components/bible/types"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useAppSettings } from "@/contexts/app-settings"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/contexts/toast-context"
import { useResponsive } from "@/hooks/use-responsive"
import { ensurePersistedSlicesHydrated } from "@/lib/sqlite-supabase-store"
import { getBookName } from "@/services/bible"
import { setPendingBibleNavigation } from "@/utils/bible-storage"
import { copyToClipboard } from "@/utils/clipboard"
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
  const { showToast } = useToast()
  const { scale, moderateScale } = useResponsive()
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth()
  const [items, setItems] = useState<FavoriteVerseRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)))

  const load = useCallback(() => {
    let active = true

    const loadFavorites = async () => {
      setIsLoading(true)

      if (isAccountDataPending) {
        return
      }

      try {
        if (currentUser && isConfigured) {
          await ensurePersistedSlicesHydrated(db, currentUser.id, ["favorites"])
          if (!active) return
        }

        const rows = await getAllFavorites(db)
        if (!active) return
        setItems(rows)
      } catch {
        if (active) {
          setItems([])
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadFavorites()

    return () => {
      active = false
    }
  }, [currentUser, db, isAccountDataPending, isConfigured])

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

  const handleCopyVerse = useCallback(
    async (item: FavoriteVerseRecord) => {
      const citation = `${getBookName(item.bookCode, appLanguage)} ${item.chapter}:${item.verse}`
      const text = `${item.verseText}\n${citation}`
      await copyToClipboard(text)
      showToast(t("toast.copySuccess"), "😊")
    },
    [appLanguage, showToast, t],
  )

  if (isLoading) {
    return <LoadingScreen message="Loading favorites..." />
  }

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
              <View className="flex-row items-center" style={{ gap: scale(4) }}>
                <Pressable
                  onPress={() => void handleCopyVerse(item)}
                  hitSlop={scale(8)}
                  className="active:bg-gray-100 dark:active:bg-gray-800"
                  style={{ padding: scale(12) }}
                >
                  <IconSymbol name="doc.on.doc" size={moderateScale(18)} color="#6b7280" />
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
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
