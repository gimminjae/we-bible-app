'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const BACKDROP_OPACITY_TARGET = 0.5;
const ANIM_DURATION = 280;

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
  const maxHeight = Dimensions.get('window').height * heightFraction;
  const [isModalVisible, setModalVisible] = useState(false);
  const didOpenRef = useRef(false);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(maxHeight);

  useEffect(() => {
    if (visible) {
      if (!didOpenRef.current) {
        didOpenRef.current = true;
        setModalVisible(true);
        backdropOpacity.value = 0;
        sheetTranslateY.value = maxHeight;
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
      sheetTranslateY.value = withTiming(maxHeight, { duration: ANIM_DURATION }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
  }, [visible, isModalVisible, maxHeight]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
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
          style={[
            {
              maxHeight,
              width: '100%',
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
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              overflow: 'hidden',
              paddingBottom: 34,
            }}
          >
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
