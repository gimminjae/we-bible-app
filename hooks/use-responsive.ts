import { useCallback } from 'react';
import { useWindowDimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * 기기 화면 크기에 맞춘 반응형 스케일 함수.
 * 화면 크기 변경 시(회전 등) 자동 갱신.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const scale = useCallback(
    (size: number) => {
      return PixelRatio.roundToNearestPixel((size * width) / BASE_WIDTH);
    },
    [width]
  );

  const verticalScale = useCallback(
    (size: number) => {
      return PixelRatio.roundToNearestPixel((size * height) / BASE_HEIGHT);
    },
    [height]
  );

  const moderateScale = useCallback(
    (size: number, factor = 0.5) => {
      const scaled = (size * width) / BASE_WIDTH;
      return PixelRatio.roundToNearestPixel(
        size + (scaled - size) * factor
      );
    },
    [width]
  );

  const wp = useCallback(
    (percent: number) => {
      return PixelRatio.roundToNearestPixel((width * percent) / 100);
    },
    [width]
  );

  const hp = useCallback(
    (percent: number) => {
      return PixelRatio.roundToNearestPixel((height * percent) / 100);
    },
    [height]
  );

  return {
    width,
    height,
    scale,
    verticalScale,
    moderateScale,
    wp,
    hp,
  };
}
