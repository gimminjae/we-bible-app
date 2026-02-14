import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { DisplayVerse } from './types';

function BibleVerseSkeleton() {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 800 }), -1, true);
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} className="flex-row gap-3 py-1">
          <View className="min-w-[36px] items-center pt-0.5">
            <Animated.View
              style={[animatedStyle]}
              className="h-5 w-6 rounded bg-gray-200 dark:bg-gray-700"
            />
            <View style={{ width: 14, height: 14 }} />
          </View>
          <View className="flex-1 gap-1">
            <Animated.View
              style={[animatedStyle]}
              className="h-5 rounded bg-gray-200 dark:bg-gray-700"
            />
            <Animated.View
              style={[animatedStyle]}
              className="h-5 w-[80%] rounded bg-gray-200 dark:bg-gray-700"
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 200;

type BibleContentProps = {
  loading: boolean;
  error: string | null;
  verses: DisplayVerse[];
  dualLang: boolean;
  fontScale: number;
  selectedVerseNumbers?: number[];
  favoriteVerseNumbers?: number[];
  memoVerseNumbers?: number[];
  scrollToTopTrigger?: string;
  onVersePress?: (verseNumber: number) => void;
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
  selectedVerseNumbers = [],
  favoriteVerseNumbers = [],
  memoVerseNumbers = [],
  scrollToTopTrigger,
  onVersePress,
  onSwipePrev,
  onSwipeNext,
  onScroll,
}: BibleContentProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollToTopTrigger]);

  const handleVersePress = useCallback(
    (verseNumber: number) => {
      onVersePress?.(verseNumber);
    },
    [onVersePress]
  );

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
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={160}
        >
          {loading ? (
            <BibleVerseSkeleton />
          ) : error ? (
            <View className="py-12 items-center">
              <Text className="text-red-500 dark:text-red-400 text-center text-base">{error}</Text>
            </View>
          ) : (
            <View className="gap-2">
              {verses.map((v, i) => {
                const verseNum = Number(v.verse) || i + 1;
                const isSelected = selectedVerseNumbers.includes(verseNum);
                const isFavorite = favoriteVerseNumbers.includes(verseNum);
                const hasMemo = memoVerseNumbers.includes(verseNum);
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleVersePress(verseNum)}
                    className="flex-row gap-3 py-1 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                  >
                    <View className="min-w-[36px] items-center pt-0.5">
                      <Text
                        className="text-gray-900 dark:text-gray-100 text-[15px] leading-6"
                        style={{ fontSize: 16 * fontScale, lineHeight: 24 * fontScale }}
                      >
                        {verseNum}
                      </Text>
                      <View className="flex-row items-center justify-center gap-0.5">
                        {isFavorite ? (
                          <IconSymbol name="heart.fill" size={14} color="#ec4899" />
                        ) : (
                          <View style={{ width: 14, height: 14 }} />
                        )}
                        {hasMemo ? (
                          <IconSymbol name="note.text" size={14} color="#b45309" />
                        ) : (
                          <View style={{ width: 14, height: 14 }} />
                        )}
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-gray-900 dark:text-gray-100 text-[15px] leading-6 ${isSelected ? 'underline decoration-dotted' : ''}`}
                        style={[
                          { fontSize: 16 * fontScale, lineHeight: 24 * fontScale },
                        ]}
                      >
                        {v.primary}
                      </Text>
                      {dualLang && v.secondary ? (
                        <Text
                          className="text-gray-600 dark:text-gray-400 text-sm mt-1 leading-5"
                          style={[
                            { fontSize: 14 * fontScale, lineHeight: 20 * fontScale },
                          ]}
                        >
                          {v.secondary}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </GestureDetector>
  );
}
