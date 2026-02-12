import { BottomSheet } from '@/components/ui/bottom-sheet';
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
  const handleSelectOption = useCallback(
    (val: BibleLang) => {
      onSelect(val);
    },
    [onSelect]
  );

  return (
    <BottomSheet visible={isOpen} onClose={onClose} heightFraction={0.5}>
      <View className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">{''}</Text>
        <Pressable onPress={onClose} className="px-2 py-1">
          <Text className="text-base text-gray-600 dark:text-gray-400">✕</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        showsVerticalScrollIndicator
      >
        {options.map((opt) => (
          <Pressable
            key={opt.val}
            onPress={() => handleSelectOption(opt.val as BibleLang)}
            className="py-3.5 px-1 rounded-xl active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Text className="text-base text-gray-900 dark:text-white">
              {opt.txt} ({opt.description})
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
