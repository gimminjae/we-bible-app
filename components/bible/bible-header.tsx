import { Pressable, Text, View } from 'react-native';

type BibleHeaderProps = {
  bookName: string;
  chapter: number;
  langLabel: string;
  onOpenBookPicker: () => void;
  onOpenLangPicker: () => void;
  onOpenSettings: () => void;
};

export function BibleHeader({
  bookName,
  chapter,
  langLabel,
  onOpenBookPicker,
  onOpenLangPicker,
  onOpenSettings,
}: BibleHeaderProps) {
  return (
    <View className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onOpenBookPicker}
            className="px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {bookName} {chapter}
            </Text>
          </Pressable>
          <Pressable
            onPress={onOpenLangPicker}
            className="px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {langLabel}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={onOpenSettings} className="px-3 py-2 rounded-lg active:opacity-70">
          <Text className="text-base font-semibold text-gray-700 dark:text-gray-200">Tt</Text>
        </Pressable>
      </View>
    </View>
  );
}
