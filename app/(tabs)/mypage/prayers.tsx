import { Button, ButtonText } from "@/components/ui/button"
import { IconSymbol } from "@/components/ui/icon-symbol"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useResponsive } from "@/hooks/use-responsive"
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

export default function PrayerListScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { t } = useI18n()
  const { scale, moderateScale, pageMaxWidth } = useResponsive()
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
            <Table>
              <TableHeader>
                <TableHead
                  className="items-center border-r border-gray-200 dark:border-gray-700"
                  textClassName="text-center"
                  style={{ flex: 0.85, minWidth: 0 }}
                >
                  {t("mypage.prayerRequester")}
                </TableHead>
                <TableHead
                  className="items-center border-r border-gray-200 dark:border-gray-700"
                  textClassName="text-center"
                  style={{ flex: 0.85, minWidth: 0 }}
                >
                  {t("mypage.prayerTarget")}
                </TableHead>
                <TableHead
                  className="items-start"
                  textClassName="text-left"
                  style={{ flex: 1.6, minWidth: 0 }}
                >
                  {t("mypage.prayerTableLatestContent")}
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
                      className="items-center border-r border-gray-200 dark:border-gray-700"
                      style={{ flex: 0.85, minWidth: 0 }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-center font-medium text-primary-600 dark:text-primary-400"
                        style={{ fontSize: moderateScale(14), lineHeight: moderateScale(20) }}
                      >
                        {getDisplayName(item.requester)}
                      </Text>
                    </TableCell>
                    <TableCell
                      className="items-center border-r border-gray-200 dark:border-gray-700"
                      style={{ flex: 0.85, minWidth: 0 }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-center font-medium text-primary-600 dark:text-primary-400"
                        style={{ fontSize: moderateScale(14), lineHeight: moderateScale(20) }}
                      >
                        {getDisplayName(item.target)}
                      </Text>
                    </TableCell>
                    <TableCell className="items-start" style={{ flex: 1.6, minWidth: 0 }}>
                      <Text
                        numberOfLines={2}
                        className="text-left text-gray-900 dark:text-white"
                        style={{
                          fontSize: moderateScale(15),
                          lineHeight: moderateScale(22),
                        }}
                      >
                        {item.latestContent || "-"}
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
