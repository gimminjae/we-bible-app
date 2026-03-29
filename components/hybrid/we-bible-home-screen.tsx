import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WeBibleWebShell } from '@/components/hybrid/we-bible-web-shell';

export function WeBibleHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <WeBibleWebShell />
      <Pressable
        onPress={() => router.push('../native-reader')}
        className="absolute bottom-24 right-4 rounded-full bg-white/95 px-4 py-3 shadow-sm active:opacity-90"
      >
        <Text className="text-xs font-semibold text-gray-700">앱 리더 열기</Text>
      </Pressable>
    </SafeAreaView>
  );
}
