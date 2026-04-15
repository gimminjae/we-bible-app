'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/use-responsive';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const BACKDROP_OPACITY_TARGET = 0.5;
const ANIM_DURATION = 280;
const SHEET_TOP_MARGIN = 16;
const MIN_SHEET_HEIGHT = 220;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Content max height as fraction of screen (e.g. 0.75 = 75%). Default 0.75 */
  heightFraction?: number;
};

export function BottomSheet({
  visible,
  onClose,
  children,
  heightFraction = 0.75,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { scale, isTablet, sheetMaxWidth } = useResponsive();
  const [isModalVisible, setModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const didOpenRef = useRef(false);

  const maxHeight = windowHeight * heightFraction;
  const sheetWidth = isTablet ? Math.min(windowWidth - 32, sheetMaxWidth) : windowWidth;
  const visibleViewportHeight = Math.max(scale(SHEET_TOP_MARGIN), windowHeight - keyboardHeight);
  const availableSheetHeight = Math.max(0, visibleViewportHeight - scale(SHEET_TOP_MARGIN));
  const sheetHeight =
    availableSheetHeight <= scale(MIN_SHEET_HEIGHT)
      ? availableSheetHeight
      : Math.min(maxHeight, availableSheetHeight);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(maxHeight);
  const sheetBottomInset = useSharedValue(0);

  useEffect(() => {
    if (!isModalVisible) {
      setKeyboardHeight(0);
      sheetBottomInset.value = 0;
      return;
    }

    const resolveKeyboardHeight = (event: KeyboardEvent) => {
      const keyboardScreenY = event.endCoordinates?.screenY ?? windowHeight;
      const overlapHeight = Math.max(0, windowHeight - keyboardScreenY);
      return Math.max(overlapHeight, event.endCoordinates?.height ?? 0);
    };

    const animateKeyboardInset = (nextKeyboardHeight: number, duration?: number) => {
      setKeyboardHeight(nextKeyboardHeight);
      sheetBottomInset.value = withTiming(nextKeyboardHeight, {
        duration: duration ?? ANIM_DURATION,
      });
    };

    const handleKeyboardShow = (event: KeyboardEvent) => {
      animateKeyboardInset(resolveKeyboardHeight(event), event.duration);
    };

    const handleKeyboardHide = (event?: KeyboardEvent) => {
      animateKeyboardInset(0, event?.duration);
    };

    const showEventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEventName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEventName, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEventName, handleKeyboardHide);
    const changeFrameSubscription =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillChangeFrame', handleKeyboardShow)
        : null;

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      changeFrameSubscription?.remove();
    };
  }, [isModalVisible, sheetBottomInset, windowHeight]);

  useEffect(() => {
    if (visible) {
      if (!didOpenRef.current) {
        didOpenRef.current = true;
        setModalVisible(true);
        backdropOpacity.value = 0;
        sheetTranslateY.value = sheetHeight;
        requestAnimationFrame(() => {
          backdropOpacity.value = withTiming(BACKDROP_OPACITY_TARGET, {
            duration: ANIM_DURATION,
          });
          sheetTranslateY.value = withTiming(0, { duration: ANIM_DURATION });
        });
      }
    } else {
      didOpenRef.current = false;
      if (!isModalVisible) return;
      backdropOpacity.value = withTiming(0, { duration: ANIM_DURATION });
      sheetTranslateY.value = withTiming(sheetHeight, { duration: ANIM_DURATION }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
  }, [visible, isModalVisible, backdropOpacity, sheetHeight, sheetTranslateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const sheetContainerStyle = useAnimatedStyle(() => ({
    paddingBottom: sheetBottomInset.value,
  }));

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,1)',
            },
            backdropStyle,
          ]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          />
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }, sheetContainerStyle]}
        >
          <Animated.View
            style={[
              {
                maxHeight,
                height: sheetHeight,
                width: sheetWidth,
                backgroundColor: 'transparent',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                overflow: 'hidden',
              },
              sheetStyle,
            ]}
          >
            <View
              className="bg-white dark:bg-gray-900"
              style={{
                flex: 1,
                borderTopLeftRadius: scale(16),
                borderTopRightRadius: scale(16),
                overflow: 'hidden',
                paddingBottom: Math.max(scale(34), insets.bottom),
              }}
            >
              {children}
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
