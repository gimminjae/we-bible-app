import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import {
  buildAppAuthCallbackUrlFromSearchParams,
  buildWebAuthCallbackUrl,
  setPendingAuthCallbackUrl,
} from '@/utils/hybrid-auth';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();

  useEffect(() => {
    const appCallbackUrl = buildAppAuthCallbackUrlFromSearchParams(params);
    const webCallbackUrl = buildWebAuthCallbackUrl(appCallbackUrl);

    if (webCallbackUrl) {
      setPendingAuthCallbackUrl(webCallbackUrl);
    }

    router.replace('/(tabs)');
  }, [params, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-center text-sm text-gray-600">
        로그인 정보를 앱으로 가져오는 중입니다.
      </Text>
    </View>
  );
}
