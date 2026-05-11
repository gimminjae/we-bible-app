import { Button, ButtonText } from "@/components/ui/button"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useResponsive } from "@/hooks/use-responsive"
import { formatShortDateTime } from "@/lib/date"
import { useI18n } from "@/utils/i18n"
import { getAllPrayers, type PrayListItem } from "@/utils/prayer-db"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useSQLiteContext } from "expo-sqlite"
import { useCallback, useMemo, useState } from "react"
import { ScrollView, Text, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

type PrayerGroup = {
  requester: string
  items: PrayListItem[]
}

function getDisplayName(name: string): string {
  return name?.trim() || "-"
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function matchesPrayerSearch(item: PrayListItem, keyword: string): boolean {
  if (!keyword) return true

  return [item.requester, item.target].some((value) =>
    normalizeSearchText(value).includes(keyword)
  )
}

const PERSONAL_PRAYER_COLUMN_WIDTHS = {
  relation: 84,
  target: 96,
  latestContent: 220,
  updatedAt: 116,
  createdAt: 116,
} as const

export default function PrayerListScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const { scale, moderateScale, pageMaxWidth } = useResponsive()
  const [items, setItems] = useState<PrayListItem[]>([])
  const [searchText, setSearchText] = useState("")
  const tableMinWidth =
    PERSONAL_PRAYER_COLUMN_WIDTHS.relation +
    PERSONAL_PRAYER_COLUMN_WIDTHS.target +
    PERSONAL_PRAYER_COLUMN_WIDTHS.latestContent +
    PERSONAL_PRAYER_COLUMN_WIDTHS.updatedAt +
    PERSONAL_PRAYER_COLUMN_WIDTHS.createdAt

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

  const filteredItems = useMemo(() => {
    const keyword = normalizeSearchText(searchText)
    return items.filter((item) => matchesPrayerSearch(item, keyword))
  }, [items, searchText])

  const myPrayerItems = useMemo(
    () => filteredItems.filter((item) => item.isMyPrayer),
    [filteredItems]
  )

  const prayerGroups = useMemo<PrayerGroup[]>(() => {
    const groups = new Map<string, PrayerGroup>()

    for (const item of filteredItems) {
      if (item.isMyPrayer) continue

      const requester = getDisplayName(item.requester)
      const existing = groups.get(requester)

      if (existing) {
        existing.items.push(item)
        continue
      }

      groups.set(requester, {
        requester,
        items: [item],
      })
    }

    return [...groups.values()]
  }, [filteredItems])

  const hasVisibleItems = myPrayerItems.length > 0 || prayerGroups.length > 0

  const handleAddPress = useCallback(() => {
    router.push("/(tabs)/mypage/prayer/add")
  }, [router])

  function renderPrayerTable(sectionItems: PrayListItem[]) {
    return (
      <Table minWidth={tableMinWidth}>
        <TableHeader>
          <TableHead
            className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
            textClassName="text-center"
            style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.target }}
          >
            {t("mypage.prayerTarget")}
          </TableHead>
          <TableHead
            className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
            textClassName="text-center"
            style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.relation }}
          >
            {t("prayerDrawer.relationLabel")}
          </TableHead>
          <TableHead
            className="items-start border-r border-gray-200 px-2 dark:border-gray-700"
            textClassName="text-left"
            style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.latestContent }}
          >
            {t("mypage.prayerTableLatestContent")}
          </TableHead>
          <TableHead
            className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
            textClassName="text-center"
            style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.updatedAt }}
          >
            {t("mypage.prayerTableUpdatedAt")}
          </TableHead>
          <TableHead
            className="items-center px-2"
            textClassName="text-center"
            style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.createdAt }}
          >
            {t("mypage.prayerTableCreatedAt")}
          </TableHead>
        </TableHeader>

        <TableBody>
          {sectionItems.map((item, index) => (
            <TableRow
              key={item.id}
              isLast={index === sectionItems.length - 1}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/mypage/prayer/[id]",
                  params: { id: String(item.id) },
                })
              }
            >
              <TableCell
                className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.target }}
              >
                <Text
                  numberOfLines={1}
                  className="text-center font-medium text-primary-600 dark:text-primary-400"
                  style={{ fontSize: moderateScale(12), lineHeight: moderateScale(17) }}
                >
                  {getDisplayName(item.target)}
                </Text>
              </TableCell>
              <TableCell
                className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.relation }}
              >
                <Text
                  numberOfLines={1}
                  className="text-center font-medium text-primary-600 dark:text-primary-400"
                  style={{ fontSize: moderateScale(12), lineHeight: moderateScale(17) }}
                >
                  {getDisplayName(item.relation)}
                </Text>
              </TableCell>
              <TableCell
                className="items-start border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.latestContent }}
              >
                <Text
                  numberOfLines={2}
                  className="text-left text-gray-900 dark:text-white"
                  style={{
                    fontSize: moderateScale(13),
                    lineHeight: moderateScale(18),
                  }}
                >
                  {item.latestContent || "-"}
                </Text>
              </TableCell>
              <TableCell
                className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.updatedAt }}
              >
                <Text
                  numberOfLines={1}
                  className="text-center text-gray-700 dark:text-gray-200"
                  style={{ fontSize: moderateScale(11), lineHeight: moderateScale(16) }}
                >
                  {formatShortDateTime(item.updatedAt)}
                </Text>
              </TableCell>
              <TableCell
                className="items-center px-2 py-2"
                style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.createdAt }}
              >
                <Text
                  numberOfLines={1}
                  className="text-center text-gray-700 dark:text-gray-200"
                  style={{ fontSize: moderateScale(11), lineHeight: moderateScale(16) }}
                >
                  {formatShortDateTime(item.createdAt)}
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "bottom", "left", "right"]}
    >
      <View
        className="flex-row items-center justify-between"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(12),
        }}
      >
        <View className="flex-row items-center" style={{ gap: scale(12) }}>
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
            {t("mypage.prayersTitle")}
          </Text>
        </View>
        <Button onPress={handleAddPress} action="primary" size="sm">
          <ButtonText>{t("mypage.addPrayer")}</ButtonText>
        </Button>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingBottom: scale(24),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: pageMaxWidth, alignSelf: "center" }}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t("mypage.prayerSearchPlaceholder")}
            placeholderTextColor="#9ca3af"
            className="mb-5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />

          {items.length === 0 ? (
            <Text className="text-gray-500 dark:text-gray-400" style={{ marginTop: scale(24) }}>
              {t("mypage.emptyPrayers")}
            </Text>
          ) : !hasVisibleItems ? (
            <Text className="text-gray-500 dark:text-gray-400" style={{ marginTop: scale(8) }}>
              {t("mypage.emptyPrayerSearchResults")}
            </Text>
          ) : (
            <>
              {myPrayerItems.length > 0 ? (
                <View style={{ marginBottom: scale(20) }}>
                  <Text
                    className="mb-2 font-semibold text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(16) }}
                  >
                    {t("mypage.myPrayerSectionTitle")}
                  </Text>
                  {renderPrayerTable(myPrayerItems)}
                </View>
              ) : null}

              {prayerGroups.map((group) => (
                <View key={group.requester} style={{ marginBottom: scale(20) }}>
                  <Text
                    className="mb-2 font-semibold text-gray-900 dark:text-white"
                    style={{ fontSize: moderateScale(16) }}
                  >
                    {group.requester}
                  </Text>
                  {renderPrayerTable(group.items)}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
