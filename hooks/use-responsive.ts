import { useCallback } from 'react';
import { useWindowDimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const TABLET_BREAKPOINT = 768;
const TABLET_SCALE_WIDTH_CAP = 480;
const TABLET_SCALE_HEIGHT_CAP = 900;
const PAGE_MAX_WIDTH = 960;
const WIDE_PAGE_MAX_WIDTH = 1120;
const NARROW_PAGE_MAX_WIDTH = 720;
const READING_MAX_WIDTH = 860;
const SHEET_MAX_WIDTH = 720;
const DIALOG_MAX_WIDTH = 560;

/**
 * 기기 화면 크기에 맞춘 반응형 스케일 함수.
 * 화면 크기 변경 시(회전 등) 자동 갱신.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= TABLET_BREAKPOINT;
  const scaleWidth = isTablet ? Math.min(width, TABLET_SCALE_WIDTH_CAP) : width;
  const scaleHeight = isTablet ? Math.min(height, TABLET_SCALE_HEIGHT_CAP) : height;
  const pageHorizontalPadding = isTablet ? 24 : 16;
  const availablePageWidth = Math.max(width - pageHorizontalPadding * 2, 0);
  const pageMaxWidth = isTablet ? Math.min(availablePageWidth, PAGE_MAX_WIDTH) : width;
  const widePageMaxWidth = isTablet ? Math.min(availablePageWidth, WIDE_PAGE_MAX_WIDTH) : width;
  const narrowPageMaxWidth = isTablet ? Math.min(availablePageWidth, NARROW_PAGE_MAX_WIDTH) : width;
  const readingMaxWidth = isTablet ? Math.min(availablePageWidth, READING_MAX_WIDTH) : width;
  const sheetMaxWidth = isTablet ? Math.min(Math.max(width - 32, 0), SHEET_MAX_WIDTH) : width;
  const dialogMaxWidth = isTablet ? Math.min(Math.max(width - 40, 0), DIALOG_MAX_WIDTH) : width;

  const scale = useCallback(
    (size: number) => {
      return PixelRatio.roundToNearestPixel((size * scaleWidth) / BASE_WIDTH);
    },
    [scaleWidth]
  );

  const verticalScale = useCallback(
    (size: number) => {
      return PixelRatio.roundToNearestPixel((size * scaleHeight) / BASE_HEIGHT);
    },
    [scaleHeight]
  );

  const moderateScale = useCallback(
    (size: number, factor = 0.5) => {
      const scaled = (size * scaleWidth) / BASE_WIDTH;
      return PixelRatio.roundToNearestPixel(
        size + (scaled - size) * factor
      );
    },
    [scaleWidth]
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

  const getAdaptiveColumns = useCallback(
    (
      minItemWidth: number,
      gap = 0,
      maxColumns = 8,
      containerWidth = width,
    ) => {
      const availableWidth = Math.max(containerWidth, minItemWidth);
      const rawColumns = Math.floor((availableWidth + gap) / (minItemWidth + gap));
      return Math.max(1, Math.min(maxColumns, rawColumns));
    },
    [width]
  );

  return {
    width,
    height,
    shortSide,
    isTablet,
    scale,
    verticalScale,
    moderateScale,
    wp,
    hp,
    pageHorizontalPadding,
    pageMaxWidth,
    widePageMaxWidth,
    narrowPageMaxWidth,
    readingMaxWidth,
    sheetMaxWidth,
    dialogMaxWidth,
    getAdaptiveColumns,
  };
}
