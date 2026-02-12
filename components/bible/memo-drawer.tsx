import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

type MemoDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  /** 제목·내용 사이에 표시할 성경 구절 텍스트 (저장 시 verseText 필드로 저장) */
  initialVerseText: string;
  onSave: (title: string, content: string) => void;
};

export function MemoDrawer({
  isOpen,
  onClose,
  initialVerseText,
  onSave,
}: MemoDrawerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const contentRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      const t = setTimeout(() => {
        contentRef.current?.focus();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSave = useCallback(() => {
    onSave(title.trim(), content.trim());
    onClose();
  }, [title, content, onSave, onClose]);

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.85}>
      <View className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">묵상 메모</Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handleSave}
            className="px-3 py-1.5 rounded-lg bg-primary-500 active:opacity-90"
          >
            <Text className="text-sm font-semibold text-white">저장</Text>
          </Pressable>
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600 dark:text-gray-400">✕</Text>
          </Pressable>
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, minHeight: 280 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            제목
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="메모 제목 (선택)"
            placeholderTextColor="#9ca3af"
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base mb-4"
          />
          {initialVerseText ? (
            <>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                성경 구절
              </Text>
              <View className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2.5 mb-4">
                <Text
                  className="text-gray-900 dark:text-gray-100 text-base leading-6"
                  selectable
                >
                  {initialVerseText}
                </Text>
              </View>
            </>
          ) : null}
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            내용
          </Text>
          <TextInput
            ref={contentRef}
            value={content}
            onChangeText={setContent}
            placeholder="묵상 내용을 입력하세요"
            placeholderTextColor="#9ca3af"
            multiline
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-base"
            style={{ textAlignVertical: 'top', minHeight: 200 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
