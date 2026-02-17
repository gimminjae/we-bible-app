import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 너비 기준 스케일 (가로 공간)
 */
export function scale(size: number): number {
  return PixelRatio.roundToNearestPixel((size * SCREEN_WIDTH) / BASE_WIDTH);
}

/**
 * 높이 기준 스케일 (세로 공간)
 */
export function verticalScale(size: number): number {
  return PixelRatio.roundToNearestPixel((size * SCREEN_HEIGHT) / BASE_HEIGHT);
}

/**
 * 폰트/텍스트용 완화된 스케일 (과도한 확대 방지)
 * factor: 0 = scale 없음, 1 = 완전 scale
 */
export function moderateScale(size: number, factor = 0.5): number {
  return PixelRatio.roundToNearestPixel(
    size + (scale(size) - size) * factor
  );
}

/**
 * 화면 너비 대비 비율 (0~1)
 */
export function wp(percent: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percent) / 100);
}

/**
 * 화면 높이 대비 비율 (0~1)
 */
export function hp(percent: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percent) / 100);
}
