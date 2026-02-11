import { Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const FADE_DURATION = 400;

type ChapterNavProps = {
  onPrev: () => void;
  onNext: () => void;
  visible?: boolean;
};

export function ChapterNav({ onPrev, onNext, visible = true }: ChapterNavProps) {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: FADE_DURATION });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={animatedStyle}
      className="absolute bottom-6 left-0 right-0 flex-row justify-center gap-5"
    >
      <Pressable
        onPress={onPrev}
        className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg active:opacity-90"
      >
        <Text className="text-white text-xl font-medium">←</Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg active:opacity-90"
      >
        <Text className="text-white text-xl font-medium">→</Text>
      </Pressable>
    </Animated.View>
  );
}
