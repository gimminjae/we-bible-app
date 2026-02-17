import { Button, ButtonText } from "@/components/ui/button"
import { useResponsive } from "@/hooks/use-responsive"
import { View } from "react-native"

type BibleHeaderProps = {
  bookName: string
  chapter: number
  langLabel: string
  onOpenBookPicker: () => void
  onOpenLangPicker: () => void
  onOpenSettings: () => void
}

export function BibleHeader({
  bookName,
  chapter,
  langLabel,
  onOpenBookPicker,
  onOpenLangPicker,
  onOpenSettings,
}: BibleHeaderProps) {
  const { scale, moderateScale } = useResponsive()
  return (
    <View
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm"
      style={{
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: scale(8) }}>
          <Button
            variant="solid"
            className="rounded-xl bg-primary-50 dark:bg-primary-950/40"
            style={{ paddingHorizontal: scale(16), paddingVertical: scale(10) }}
            onPress={onOpenBookPicker}
            action="primary"
          >
            <ButtonText
              className="font-semibold text-primary-600 dark:text-primary-400"
              style={{ fontSize: moderateScale(14) }}
            >
              {bookName} {chapter}
            </ButtonText>
          </Button>
          <Button
            variant="solid"
            className="rounded-xl bg-primary-50 dark:bg-primary-950/40"
            style={{ paddingHorizontal: scale(16), paddingVertical: scale(10) }}
            onPress={onOpenLangPicker}
            action="primary"
          >
            <ButtonText
              className="font-semibold text-primary-600 dark:text-primary-400"
              style={{ fontSize: moderateScale(14) }}
            >
              {langLabel}
            </ButtonText>
          </Button>
        </View>
        <Button
          variant="link"
          className="rounded-lg"
          style={{ paddingHorizontal: scale(12), paddingVertical: scale(8) }}
          onPress={onOpenSettings}
        >
          <ButtonText
            className="font-semibold text-gray-700 dark:text-gray-200"
            style={{ fontSize: moderateScale(16) }}
          >
            Tt
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}
