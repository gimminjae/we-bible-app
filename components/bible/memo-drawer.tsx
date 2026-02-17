import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useResponsive } from '@/hooks/use-responsive';
import { useI18n } from '@/utils/i18n';
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
  /** 수정 모드: 기존 메모 데이터 */
  editMemo?: { id: number; title: string; content: string; verseText: string };
  /** 수정 모드에서 저장 시 호출 */
  onSaveEdit?: (id: number, title: string, content: string) => void;
};

export function MemoDrawer({
  isOpen,
  onClose,
  initialVerseText,
  onSave,
  editMemo,
  onSaveEdit,
}: MemoDrawerProps) {
  const { t } = useI18n();
  const { scale, moderateScale } = useResponsive();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const contentRef = useRef<TextInput>(null);
  const isEditMode = Boolean(editMemo);

  useEffect(() => {
    if (isOpen) {
      if (editMemo) {
        setTitle(editMemo.title);
        setContent(editMemo.content);
      } else {
        setTitle('');
        setContent('');
      }
      const timer = setTimeout(() => {
        contentRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, editMemo]);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (isEditMode && editMemo && onSaveEdit) {
      onSaveEdit(editMemo.id, trimmedTitle, trimmedContent);
    } else {
      onSave(trimmedTitle, trimmedContent);
    }
    onClose();
  }, [title, content, isEditMode, editMemo, onSave, onSaveEdit, onClose]);

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.85}>
      <View
        className="border-b border-gray-100 dark:border-gray-800"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(12),
        }}
      >
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: moderateScale(18) }}
        >
          {isEditMode ? t('memoDrawer.editTitle') : t('memoDrawer.title')}
        </Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, minHeight: 280 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: scale(16),
            paddingVertical: scale(12),
            paddingBottom: scale(16),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text
            className="font-medium text-gray-600 dark:text-gray-400"
            style={{ fontSize: moderateScale(14), marginBottom: scale(6) }}
          >
            {t('memoDrawer.titleLabel')}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('memoDrawer.titlePlaceholder')}
            placeholderTextColor="#9ca3af"
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
            style={{
              paddingHorizontal: scale(12),
              paddingVertical: scale(10),
              fontSize: moderateScale(16),
              marginBottom: scale(16),
            }}
          />
          {(initialVerseText || editMemo?.verseText) ? (
            <>
              <Text
                className="font-medium text-gray-600 dark:text-gray-400"
                style={{ fontSize: moderateScale(14), marginBottom: scale(6) }}
              >
                {t('memoDrawer.verseTextLabel')}
              </Text>
              <View
                className="bg-gray-100 dark:bg-gray-800 rounded-lg"
                style={{
                  paddingHorizontal: scale(12),
                  paddingVertical: scale(10),
                  marginBottom: scale(16),
                }}
              >
                <Text
                  className="text-gray-900 dark:text-gray-100"
                  style={{ fontSize: moderateScale(16), lineHeight: moderateScale(24) }}
                  selectable
                >
                  {editMemo?.verseText ?? initialVerseText}
                </Text>
              </View>
            </>
          ) : null}
          <Text
            className="font-medium text-gray-600 dark:text-gray-400"
            style={{ fontSize: moderateScale(14), marginBottom: scale(6) }}
          >
            {t('memoDrawer.contentLabel')}
          </Text>
          <TextInput
            ref={contentRef}
            value={content}
            onChangeText={setContent}
            placeholder={t('memoDrawer.contentPlaceholder')}
            placeholderTextColor="#9ca3af"
            multiline
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
            style={{
              textAlignVertical: 'top',
              minHeight: scale(200),
              paddingHorizontal: scale(12),
              paddingVertical: scale(10),
              fontSize: moderateScale(16),
            }}
          />
        </ScrollView>
        <View
          className="border-t border-gray-100 dark:border-gray-800 flex-row"
          style={{
            paddingHorizontal: scale(16),
            paddingTop: scale(8),
            paddingBottom: scale(16),
            gap: scale(12),
          }}
        >
          <Pressable
            onPress={onClose}
            className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 items-center justify-center active:opacity-80"
            style={{ height: scale(48) }}
          >
            <Text
              className="font-semibold text-gray-800 dark:text-gray-100"
              style={{ fontSize: moderateScale(16) }}
            >
              {t('memoDrawer.cancel')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            className="flex-1 rounded-xl bg-primary-500 items-center justify-center active:opacity-90"
            style={{ height: scale(48) }}
          >
            <Text
              className="font-semibold text-white"
              style={{ fontSize: moderateScale(16) }}
            >
              {t('memoDrawer.save')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
