'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type ToastContextValue = {
  showToast: (message: string, emoji?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 2000;
const DEFAULT_EMOJI = '😊';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string>(DEFAULT_EMOJI);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  const showToast = useCallback((msg: string, emojiOverride?: string) => {
    setMessage(msg);
    setEmoji(emojiOverride ?? DEFAULT_EMOJI);
    opacity.value = 0;
    translateY.value = -20;
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: TOAST_DURATION_MS }),
      withTiming(0, { duration: 200 }, () => {
        runOnJS(setMessage)(null);
      })
    );
    translateY.value = withSequence(
      withTiming(0, { duration: 200 }),
      withTiming(0, { duration: TOAST_DURATION_MS }),
      withTiming(-20, { duration: 200 })
    );
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <Animated.View
          style={[styles.container, animatedStyle]}
          pointerEvents="none"
        >
          <View style={styles.toast}>
            <Text style={styles.text}>
              {emoji} {message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
