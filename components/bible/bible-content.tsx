import { Spinner } from '@gluestack-ui/themed';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { DisplayVerse } from './types';

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 200;

type BibleContentProps = {
  loading: boolean;
  error: string | null;
  verses: DisplayVerse[];
  dualLang: boolean;
  fontScale: number;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  onScroll?: () => void;
};

export function BibleContent({
  loading,
  error,
  verses,
  dualLang,
  fontScale,
  onSwipePrev,
  onSwipeNext,
  onScroll,
}: BibleContentProps) {
  const panGesture = Gesture.Pan()
    .activeOffsetX([-35, 35])
    .failOffsetY([-30, 30])
    .onEnd((e) => {
      'worklet';
      const { translationX, velocityX } = e;
      const goPrev = translationX > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD;
      const goNext = translationX < -SWIPE_THRESHOLD || velocityX < -VELOCITY_THRESHOLD;
      if (goPrev && onSwipePrev) runOnJS(onSwipePrev)();
      if (goNext && onSwipeNext) runOnJS(onSwipeNext)();
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={160}
        >
          {loading ? (
            <View className="py-16 items-center justify-center">
              <Spinner size="large" />
            </View>
          ) : error ? (
            <View className="py-12 items-center">
              <Text className="text-red-500 dark:text-red-400 text-center text-base">{error}</Text>
            </View>
          ) : (
            <View className="gap-4">
              {verses.map((v, i) => (
                <View
                  key={i}
                  className="flex-row gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <View className="w-7 items-center pt-0.5">
                    <View className="min-w-[24px] h-6 rounded-md bg-primary-100 dark:bg-primary-900/50 items-center justify-center px-1">
                      <Text className="text-xs font-bold text-primary-600 dark:text-primary-400">
                        {v.verse ?? i + 1}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-gray-900 dark:text-gray-100 text-[15px] leading-6"
                      style={{ fontSize: 16 * fontScale, lineHeight: 24 * fontScale }}
                    >
                      {v.primary}
                    </Text>
                    {dualLang && v.secondary ? (
                      <Text
                        className="text-gray-600 dark:text-gray-400 text-sm mt-1 leading-5"
                        style={{ fontSize: 14 * fontScale, lineHeight: 20 * fontScale }}
                      >
                        {v.secondary}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </GestureDetector>
  );
}
