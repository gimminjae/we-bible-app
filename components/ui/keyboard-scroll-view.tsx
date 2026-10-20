import { type Ref, useCallback, useEffect, useRef } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, type ScrollViewProps } from 'react-native';
import { inputScrollOffset } from '@/utils/keyboard-layout';
import { KeyboardAvoidingLayout } from './keyboard-layout';

type Props = ScrollViewProps & {
  ref?: Ref<ScrollView>;
  /** Reserve space for the input's following action row. */
  inputBottomSpace?: number;
};
type MeasurableInput = Pick<TextInput, 'measureInWindow'>;

function isFocused(input: MeasurableInput) {
  return Object.is(
    input,
    Platform.OS === 'web' ? document.activeElement : TextInput.State.currentlyFocusedInput(),
  );
}

export function KeyboardScrollView({
  ref,
  inputBottomSpace = 72,
  onFocus,
  onBlur,
  onLayout,
  onScroll,
  onContentSizeChange,
  ...props
}: Props) {
  const scroll = useRef<ScrollView>(null);
  const focused = useRef<MeasurableInput | null>(null);
  const scrollY = useRef(0);
  const frame = useRef<number | null>(null);
  const revealInput = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focused.current;
      const viewport = scroll.current?.getNativeScrollRef();
      if (!input || !viewport || !isFocused(input)) return;
      viewport.measureInWindow((_x, viewportY, _width, viewportHeight) => {
        input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
          // An input can unmount or lose focus while a native measurement is pending.
          if (focused.current !== input || !isFocused(input) || viewportHeight <= 0) return;
          const y = inputScrollOffset({
            scrollY: scrollY.current,
            viewportY,
            viewportHeight,
            inputY,
            inputHeight,
            bottomSpace: inputBottomSpace,
          });
          if (Math.abs(y - scrollY.current) > 1) {
            scroll.current?.scrollTo({ y, animated: false });
          }
        });
      });
    });
  }, [inputBottomSpace]);
  useEffect(() => {
    // onLayout handles resizing; didShow also handles focus before the animation ends.
    const subscription = Keyboard.addListener('keyboardDidShow', revealInput);
    return () => {
      subscription.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [revealInput]);

  return (
    <KeyboardAvoidingLayout>
      <ScrollView
        {...props}
        ref={(value) => {
          scroll.current = value;
          if (typeof ref === 'function') return ref(value);
          if (ref) ref.current = value;
        }}
        automaticallyAdjustKeyboardInsets={false}
        keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? 'handled'}
        keyboardDismissMode={props.keyboardDismissMode ?? 'interactive'}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
        onFocus={(event) => {
          // TextInput focus bubbles through both ScrollView and FlatList children.
          // RN Web still exposes currentlyFocusedField(), returning the DOM input.
          const input = (Platform.OS === 'web'
            ? TextInput.State.currentlyFocusedField()
            : TextInput.State.currentlyFocusedInput()) as unknown as MeasurableInput | null;
          focused.current = typeof input?.measureInWindow === 'function' ? input : null;
          revealInput();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focused.current = null;
          onBlur?.(event);
        }}
        onLayout={(event) => {
          revealInput();
          onLayout?.(event);
        }}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onContentSizeChange={(width, height) => {
          revealInput();
          onContentSizeChange?.(width, height);
        }}
      />
    </KeyboardAvoidingLayout>
  );
}
