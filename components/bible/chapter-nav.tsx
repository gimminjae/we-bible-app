import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/ui/feature';
import { useI18n } from '@/utils/i18n';
import { useCallback, useEffect } from 'react';
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
  const { scale, isTablet } = useResponsive();
  const { t } = useI18n();
  const opacity = useSharedValue(visible ? 1 : 0);
  const buttonSize = isTablet ? 48 : scale(56);
  const buttonGap = isTablet ? scale(12) : scale(20);
  const bottomOffset = isTablet ? scale(20) : scale(24);

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
          bottom: bottomOffset,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: buttonGap,
        },
      ]}
    >
      <Button
        onPress={onPrev}
        accessibilityLabel={t('bibleReader.previousChapter')}
        className="rounded-full bg-primary-500 px-0 shadow-lg active:opacity-90"
        style={{ width: buttonSize, height: buttonSize }}
      >
        <AppIcon name="arrow-back" onPrimary size={24} />
      </Button>
      <Button
        onPress={onNext}
        accessibilityLabel={t('bibleReader.nextChapter')}
        className="rounded-full bg-primary-500 px-0 shadow-lg active:opacity-90"
        style={{ width: buttonSize, height: buttonSize }}
      >
        <AppIcon name="arrow-forward" onPrimary size={24} />
      </Button>
    </Animated.View>
  );
}
