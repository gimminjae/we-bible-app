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
import { useCallback, useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

function getDisplayName(name: string): string {
  return name?.trim() || "-"
}

const PERSONAL_PRAYER_COLUMN_WIDTHS = {
  requester: 96,
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
  const tableMinWidth =
    PERSONAL_PRAYER_COLUMN_WIDTHS.requester +
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

  const handleAddPress = useCallback(async () => {
    router.push("/(tabs)/mypage/prayer/add")
  }, [router])

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
          <Text className="font-bold text-gray-900 dark:text-white" style={{ fontSize: moderateScale(18), marginLeft: scale(8) }}>
            {t("mypage.prayersTitle")}
          </Text>
        </View>
        <Button onPress={handleAddPress} action="primary" size="sm">
          <ButtonText>{t('mypage.addPrayer')}</ButtonText>
        </Button>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingBottom: scale(24),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: pageMaxWidth, alignSelf: "center" }}>
          {items.length === 0 ? (
            <Text className="text-gray-500 dark:text-gray-400" style={{ marginTop: scale(24) }}>
              {t("mypage.emptyPrayers")}
            </Text>
          ) : (
            <Table minWidth={tableMinWidth}>
              <TableHeader>
                <TableHead
                  className="items-center border-r border-gray-200 px-2 dark:border-gray-700"
                  textClassName="text-center"
                  style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.requester }}
                >
                  {t("mypage.prayerRequester")}
                </TableHead>
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
                {items.map((item, index) => (
                  <TableRow
                    key={item.id}
                    isLast={index === items.length - 1}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/mypage/prayer/[id]",
                        params: { id: String(item.id) },
                      })
                    }
                  >
                    <TableCell
                      className="items-center border-r border-gray-200 px-2 py-2 dark:border-gray-700"
                      style={{ width: PERSONAL_PRAYER_COLUMN_WIDTHS.requester }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-center font-medium text-primary-600 dark:text-primary-400"
                        style={{ fontSize: moderateScale(12), lineHeight: moderateScale(17) }}
                      >
                        {getDisplayName(item.requester)}
                      </Text>
                    </TableCell>
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
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
