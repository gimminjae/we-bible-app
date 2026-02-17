import { useCallback, useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { useResponsive } from '@/hooks/use-responsive';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const FADE_DURATION = 400;

type ChapterNavProps = {
  onPrev: () => void;
  onNext: () => void;
  visible?: boolean;
};

export function ChapterNav({ onPrev, onNext, visible = true }: ChapterNavProps) {
  const { scale, moderateScale } = useResponsive();
  const opacity = useSharedValue(visible ? 1 : 0);

  const syncNavOpacityToVisible = useCallback(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: FADE_DURATION });
  }, [visible, opacity]);

  useEffect(syncNavOpacityToVisible, [syncNavOpacityToVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        animatedStyle,
        {
          position: 'absolute',
          bottom: scale(24),
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: scale(20),
        },
      ]}
    >
      <Pressable
        onPress={onPrev}
        className="rounded-full bg-primary-500 items-center justify-center shadow-lg active:opacity-90"
        style={{ width: scale(56), height: scale(56) }}
      >
        <Text
          style={{ fontSize: moderateScale(20), color: 'white' }}
          className="font-medium"
        >
          ←
        </Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        className="rounded-full bg-primary-500 items-center justify-center shadow-lg active:opacity-90"
        style={{ width: scale(56), height: scale(56) }}
      >
        <Text
          style={{ fontSize: moderateScale(20), color: 'white' }}
          className="font-medium"
        >
          →
        </Text>
      </Pressable>
    </Animated.View>
  );
}
