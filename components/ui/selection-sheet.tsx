import { ScrollView, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';

export type SelectionOption = {
  value: string;
  label: string;
  description?: string;
};

type SelectionSheetProps = {
  visible: boolean;
  title: string;
  value?: string | null;
  options: SelectionOption[];
  onClose: () => void;
  onSelect: (value: string) => void;
};

export function SelectionSheet({
  visible,
  title,
  value,
  options,
  onClose,
  onSelect,
}: SelectionSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.6}>
      <View className="flex-1">
        <View className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">{title}</Text>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {options.map((option) => {
            const selected = option.value === (value ?? '');
            return (
              <Pressable
                key={`${title}-${option.value}`}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className={`mb-3 rounded-2xl border px-4 py-4 ${
                  selected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    selected
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {option.label}
                </Text>
                {option.description ? (
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
