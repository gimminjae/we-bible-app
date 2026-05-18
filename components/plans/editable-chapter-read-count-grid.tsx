import { Button, ButtonText } from '@/components/ui/button'
import { formatReadCountBadge, isChapterRead, normalizeChapterReadCount } from '@/lib/plan'
import { useRef } from 'react'
import { Text, View } from 'react-native'

const CHAPTER_BUTTON_LONG_PRESS_MS = 400

type EditableChapterReadCountGridProps = {
  maxChapter: number
  chapters: number[]
  onIncrement: (chapterIndex: number) => void
  onDecrement: (chapterIndex: number) => void
  onChapterLongPress?: (chapter: number) => void | Promise<void>
  disabled?: boolean
}

export function EditableChapterReadCountGrid({
  maxChapter,
  chapters,
  onIncrement,
  onDecrement,
  onChapterLongPress,
  disabled = false,
}: EditableChapterReadCountGridProps) {
  const chapterPressStartedAtRef = useRef(0)

  return (
    <View className="flex-row flex-wrap">
      {Array.from({ length: maxChapter }, (_entry, chapterIndex) => {
        const readCount = normalizeChapterReadCount(chapters[chapterIndex])
        const read = isChapterRead(readCount)

        return (
          <View key={chapterIndex} className="mb-4 w-1/5 items-center px-1">
            <View className="relative">
              <Button
                disabled={disabled}
                onPressIn={() => {
                  chapterPressStartedAtRef.current = Date.now()
                }}
                onPress={() => {
                  if (
                    onChapterLongPress &&
                    Date.now() - chapterPressStartedAtRef.current >= CHAPTER_BUTTON_LONG_PRESS_MS
                  ) {
                    return
                  }
                  onIncrement(chapterIndex)
                }}
                onLongPress={() => onChapterLongPress?.(chapterIndex + 1)}
                delayLongPress={CHAPTER_BUTTON_LONG_PRESS_MS}
                action={read ? 'positive' : 'secondary'}
                variant={read ? 'solid' : 'outline'}
                size="xs"
                className="h-12 w-12 rounded-full border p-0 min-h-0 items-center justify-center"
              >
                <ButtonText className="text-xs font-medium">{chapterIndex + 1}</ButtonText>
              </Button>
              {readCount > 0 ? (
                <View className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-primary-500 px-1 py-0.5 items-center">
                  <Text className="text-[10px] font-bold text-white">
                    {formatReadCountBadge(readCount)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-2 flex-row gap-2">
              <Button
                disabled={disabled || readCount <= 0}
                onPress={() => onDecrement(chapterIndex)}
                action="secondary"
                variant="outline"
                size="xs"
                className="h-7 w-7 rounded-full border-gray-200 bg-white p-0 min-h-0 dark:border-gray-700 dark:bg-gray-900"
              >
                <ButtonText className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  -
                </ButtonText>
              </Button>
              <Button
                disabled={disabled}
                onPress={() => onIncrement(chapterIndex)}
                action="primary"
                variant="solid"
                size="xs"
                className="h-7 w-7 rounded-full p-0 min-h-0"
              >
                <ButtonText className="text-xs font-semibold text-white">+</ButtonText>
              </Button>
            </View>
          </View>
        )
      })}
    </View>
  )
}
