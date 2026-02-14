import { Button, ButtonText } from "@/components/ui/button" // Assuming this imports gluestack Button
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
  return (
    <View className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Button
            variant="solid"
            className="px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40"
            onPress={onOpenBookPicker}
            action="primary"
          >
            <ButtonText className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {bookName} {chapter}
            </ButtonText>
          </Button>
          <Button
            variant="solid"
            className="px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40"
            onPress={onOpenLangPicker}
            action="primary"
          >
            <ButtonText className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {langLabel}
            </ButtonText>
          </Button>
        </View>
        <Button
          variant="link"
          className="px-3 py-2 rounded-lg"
          onPress={onOpenSettings}
        >
          <ButtonText className="text-base font-semibold text-gray-700 dark:text-gray-200">
            Tt
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}
