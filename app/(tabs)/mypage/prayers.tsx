import { IconSymbol } from "@/components/ui/icon-symbol"
import { useI18n } from "@/utils/i18n"
import { getAllPrayers, type PrayListItem } from "@/utils/prayer-db"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

function formatDate(raw: string): string {
  if (!raw) return "-"
  const [date, time = ""] = raw.split(" ")
  const [y = "", m = "", d = ""] = date.split("-")
  const hm = time.slice(0, 5)
  return `${y}.${m}.${d} ${hm}`.trim()
}

type PrayerLabelSegment = { text: string; bold?: boolean }

function getPrayerLabelSegments(
  requester: string,
  target: string,
  t: (key: string) => string
): PrayerLabelSegment[] {
  const r = requester?.trim() ?? ""
  const tgt = target?.trim() ?? ""
  const suffix = t("mypage.prayerNameSuffix") || ""
  const rName = r ? `${r}${suffix}` : ""
  const tgtName = tgt ? `${tgt}${suffix}` : ""

  if (tgt && r && r !== tgt) {
    const format = t("mypage.prayerRequestedForFormat")
    const parts = format.split(/\{requester\}|\{target\}/)
    const tokens = format.match(/\{requester\}|\{target\}/g) ?? []
    const segments: PrayerLabelSegment[] = []
    parts.forEach((part, i) => {
      if (part) segments.push({ text: part })
      if (tokens[i] === "{requester}") segments.push({ text: rName, bold: true })
      if (tokens[i] === "{target}") segments.push({ text: tgtName, bold: true })
    })
    return segments
  }
  if (tgt || r) {
    const name = tgtName || rName
    const format = t("mypage.prayerForTargetFormat")
    const [before, after] = format.split("{target}")
    const segments: PrayerLabelSegment[] = []
    if (before) segments.push({ text: before })
    segments.push({ text: name, bold: true })
    if (after) segments.push({ text: after })
    return segments
  }
  return [{ text: "-" }]
}

export default function PrayerListScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const [items, setItems] = useState<PrayListItem[]>([])

  const load = useCallback(() => {
    let active = true
    getAllPrayers(db).then((rows) => {
      if (!active) return
      setItems(rows)
    })
    return () => {
      active = false
    }
  }, [db])

  useFocusEffect(load)

  const handleAddPress = useCallback(async () => {
    router.push("/(tabs)/mypage/prayer/add")
  }, [router])

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
            {t("mypage.prayersTitle")}
          </Text>
        </View>
        <Pressable
          onPress={handleAddPress}
          className="px-3 py-2 rounded-lg bg-primary-500 active:opacity-90"
        >
          <Text className="text-sm font-semibold text-white">
            {t("mypage.addPrayer")}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="text-gray-500 dark:text-gray-400 mt-6">
            {t("mypage.emptyPrayers")}
          </Text>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/mypage/prayer/[id]",
                  params: { id: String(item.id) },
                })
              }
              className="mb-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <Text className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                {getPrayerLabelSegments(item.requester, item.target, t).map(
                  (seg, i) =>
                    seg.bold ? (
                      <Text key={i} className="font-bold">
                        {seg.text}
                      </Text>
                    ) : (
                      <Text key={i}>{seg.text}</Text>
                    )
                )}
              </Text>
              <Text
                numberOfLines={2}
                className="text-base text-gray-900 dark:text-white leading-6 mt-1"
              >
                {item.latestContent || "-"}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {formatDate(item.latestContentAt)}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
