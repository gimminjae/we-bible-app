import {
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

/** A screen or modal must have exactly one owner for keyboard avoidance. */
export const KeyboardAvoidanceContext = createContext(false);

export function KeyboardAvoidingLayout({ children }: { children: ReactNode }) {
  const alreadyAvoiding = useContext(KeyboardAvoidanceContext);
  const frame = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  if (alreadyAvoiding) return <>{children}</>;
  return (
    <View
      ref={frame}
      style={{ flex: 1, minHeight: 0 }}
      onLayout={() => {
        // Includes the safe area and any screen header above this container.
        frame.current?.measureInWindow((_x, y) => setOffset(y));
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        enabled={Platform.OS === 'ios'}
        behavior="padding"
        keyboardVerticalOffset={offset}
      >
        <KeyboardAvoidanceContext.Provider value>
          {children}
        </KeyboardAvoidanceContext.Provider>
      </KeyboardAvoidingView>
    </View>
  );
}
