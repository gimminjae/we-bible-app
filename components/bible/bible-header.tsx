import { Button, ButtonText } from "@/components/ui/button"
import { useResponsive } from "@/hooks/use-responsive"
import { View } from "react-native"
import { AppIcon } from "@/components/ui/feature"
import { useI18n } from "@/utils/i18n"

type BibleHeaderProps = {
  bookName: string
  chapter: number
  isInitialLocationReady: boolean
  langLabel: string
  onOpenBookPicker: () => void
  onOpenLangPicker: () => void
  onOpenSettings: () => void
}

export function BibleHeader({
  bookName,
  chapter,
  isInitialLocationReady,
  langLabel,
  onOpenBookPicker,
  onOpenLangPicker,
  onOpenSettings,
}: BibleHeaderProps) {
  const { scale, moderateScale } = useResponsive()
  const { t } = useI18n()
  return (
    <View
      className="bg-white dark:bg-gray-900 border-b border-emerald-100 dark:border-emerald-900"
      style={{
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
      }}
    >
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center" style={{ gap: scale(8) }}>
          {isInitialLocationReady ? (
            <Button
              variant="solid"
              className="h-auto min-h-11 shrink gap-2 rounded-2xl bg-primary-50 px-3 py-3 dark:bg-primary-950"
              onPress={onOpenBookPicker}
              action="primary"
            >
              <AppIcon name="book-outline" size={18} />
              <ButtonText
                className="font-semibold text-primary-600 dark:text-primary-400"
              >
                {bookName} {chapter}
              </ButtonText>
              <AppIcon name="chevron-down" size={14} />
            </Button>
          ) : (
            <View className="h-10 w-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
          )}
          <Button
            variant="solid"
            className="h-auto min-h-11 gap-2 rounded-2xl bg-amber-50 px-3 py-3 dark:bg-amber-950"
            onPress={onOpenLangPicker}
            action="primary"
          >
            <AppIcon name="language-outline" tone="memo" size={18} />
            <ButtonText
              className="font-semibold text-amber-800 dark:text-amber-200"
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
          accessibilityLabel={t('bibleReader.readerSettings')}
        >
          <AppIcon name="options-outline" tone="settings" size={moderateScale(24)} />
        </Button>
      </View>
    </View>
  )
}
