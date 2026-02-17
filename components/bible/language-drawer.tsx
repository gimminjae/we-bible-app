import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useResponsive } from '@/hooks/use-responsive';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { BibleLang, VersionOption } from './types';

type LanguageDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  options: VersionOption[];
  onSelect: (val: BibleLang) => void;
};

export function LanguageDrawer({ isOpen, onClose, options, onSelect }: LanguageDrawerProps) {
  const { scale, moderateScale } = useResponsive();
  const handleSelectOption = useCallback(
    (val: BibleLang) => {
      onSelect(val);
    },
    [onSelect]
  );

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.5}>
      <View
        className="border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between"
        style={{
          paddingHorizontal: scale(16),
          paddingTop: scale(16),
          paddingBottom: scale(8),
        }}
      >
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: moderateScale(18) }}
        >
          {''}
        </Text>
        <Pressable onPress={onClose} style={{ paddingHorizontal: scale(8), paddingVertical: scale(4) }}>
          <Text
            className="text-gray-600 dark:text-gray-400"
            style={{ fontSize: moderateScale(16) }}
          >
            ✕
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingVertical: scale(8),
        }}
        showsVerticalScrollIndicator
      >
        {options.map((opt) => (
          <Pressable
            key={opt.val}
            onPress={() => handleSelectOption(opt.val as BibleLang)}
            className="rounded-xl active:bg-gray-100 dark:active:bg-gray-800"
            style={{ paddingVertical: scale(14), paddingHorizontal: scale(4) }}
          >
            <Text
              className="text-gray-900 dark:text-white"
              style={{ fontSize: moderateScale(16) }}
            >
              {opt.txt} ({opt.description})
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
