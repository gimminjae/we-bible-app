import { useState, type CSSProperties } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';

import { WE_BIBLE_WEB_URL } from '@/components/hybrid/we-bible-web.constants';

const iframeStyle: CSSProperties = {
  border: 'none',
  flex: 1,
  height: '100%',
  width: '100%',
};

export function WeBibleWebShell() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View className="flex-1 bg-white">
      <iframe
        src={WE_BIBLE_WEB_URL}
        title="We Bible Web"
        style={iframeStyle}
        onLoad={() => setIsLoading(false)}
      />
      {isLoading ? (
        <View className="absolute inset-0 items-center justify-center bg-white/90 px-6">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-center text-sm text-gray-600">
            웹 앱을 불러오는 중입니다.
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={() => Linking.openURL(WE_BIBLE_WEB_URL)}
        className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 active:opacity-80"
      >
        <Text className="text-xs font-semibold text-gray-700">새 창에서 열기</Text>
      </Pressable>
    </View>
  );
}
