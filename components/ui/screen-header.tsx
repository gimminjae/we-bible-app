import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
};

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
      <View className="min-w-0 flex-1 flex-row items-center">
        {onBack ? (
          <Pressable
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800"
          >
            <IconSymbol
              name="chevron.right"
              size={18}
              color="#9ca3af"
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
        ) : null}
        <Text className="flex-1 text-xl font-bold text-gray-900 dark:text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View className="ml-3 flex-row items-center gap-2">{right}</View> : null}
    </View>
  );
}
