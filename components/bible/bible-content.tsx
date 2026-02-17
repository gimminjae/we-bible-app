import { IconSymbol } from '@/components/ui/icon-symbol';
import { useResponsive } from '@/hooks/use-responsive';
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
  const { scale, moderateScale } = useResponsive();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 800 }), -1, true);
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ gap: scale(8) }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} className="flex-row py-1" style={{ gap: scale(12) }}>
          <View className="items-center pt-0.5" style={{ minWidth: scale(36) }}>
            <Animated.View
              style={[animatedStyle, { height: scale(20), width: scale(24), borderRadius: 4 }]}
              className="bg-gray-200 dark:bg-gray-700"
            />
            <View style={{ width: moderateScale(14), height: moderateScale(14) }} />
          </View>
          <View className="flex-1" style={{ gap: scale(4) }}>
            <Animated.View
              style={[animatedStyle, { height: scale(20), borderRadius: 4 }]}
              className="bg-gray-200 dark:bg-gray-700"
            />
            <Animated.View
              style={[animatedStyle, { height: scale(20), width: '80%', borderRadius: 4 }]}
              className="bg-gray-200 dark:bg-gray-700"
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
  const { scale, moderateScale } = useResponsive();

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
          contentContainerStyle={{
            paddingHorizontal: scale(16),
            paddingTop: scale(20),
            paddingBottom: scale(40),
          }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={160}
        >
          {loading ? (
            <BibleVerseSkeleton />
          ) : error ? (
            <View className="items-center" style={{ paddingVertical: scale(48) }}>
              <Text
                className="text-red-500 dark:text-red-400 text-center"
                style={{ fontSize: moderateScale(16) }}
              >
                {error}
              </Text>
            </View>
          ) : (
            <View style={{ gap: scale(8) }}>
              {verses.map((v, i) => {
                const verseNum = Number(v.verse) || i + 1;
                const isSelected = selectedVerseNumbers.includes(verseNum);
                const isFavorite = favoriteVerseNumbers.includes(verseNum);
                const hasMemo = memoVerseNumbers.includes(verseNum);
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleVersePress(verseNum)}
                    className="flex-row py-1 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    style={{ gap: scale(12) }}
                  >
                    <View className="items-center pt-0.5" style={{ minWidth: scale(36) }}>
                      <Text
                        className="text-gray-900 dark:text-gray-100"
                        style={{
                          fontSize: moderateScale(16) * fontScale,
                          lineHeight: moderateScale(24) * fontScale,
                        }}
                      >
                        {verseNum}
                      </Text>
                      <View
                        className="flex-row items-center justify-center"
                        style={{ gap: scale(2) }}
                      >
                        {isFavorite ? (
                          <IconSymbol
                            name="heart.fill"
                            size={moderateScale(14)}
                            color="#ec4899"
                          />
                        ) : (
                          <View
                            style={{
                              width: moderateScale(14),
                              height: moderateScale(14),
                            }}
                          />
                        )}
                        {hasMemo ? (
                          <IconSymbol
                            name="note.text"
                            size={moderateScale(14)}
                            color="#b45309"
                          />
                        ) : (
                          <View
                            style={{
                              width: moderateScale(14),
                              height: moderateScale(14),
                            }}
                          />
                        )}
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-gray-900 dark:text-gray-100 ${isSelected ? 'underline decoration-dotted' : ''}`}
                        style={[
                          {
                            fontSize: moderateScale(16) * fontScale,
                            lineHeight: moderateScale(24) * fontScale,
                          },
                        ]}
                      >
                        {v.primary}
                      </Text>
                      {dualLang && v.secondary ? (
                        <Text
                          className="text-gray-600 dark:text-gray-400"
                          style={[
                            {
                              fontSize: moderateScale(14) * fontScale,
                              lineHeight: moderateScale(20) * fontScale,
                              marginTop: scale(4),
                            },
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
