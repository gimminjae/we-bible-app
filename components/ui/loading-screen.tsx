import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/use-responsive';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const { dialogMaxWidth } = useResponsive();

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View
          className="w-full items-center rounded-3xl border border-gray-200 bg-white px-8 py-12 dark:border-gray-800 dark:bg-gray-900"
          style={{ maxWidth: dialogMaxWidth }}
        >
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {message}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
