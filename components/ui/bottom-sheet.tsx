'use client';

import React from 'react';
import { Dimensions, Modal, Pressable, View } from 'react-native';

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        />
        <View
          style={{
            maxHeight,
            width: '100%',
            backgroundColor: 'transparent',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'hidden',
          }}
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
        </View>
      </View>
    </Modal>
  );
}
