import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';

import {
  WE_BIBLE_WEB_URL,
} from '@/components/hybrid/we-bible-web.constants';
import {
  buildWebAuthCallbackUrl,
  consumePendingAuthCallbackUrl,
  isWeBibleAppAuthCallbackUrl,
  isWeBibleWebUrl,
  rewriteOAuthRedirectUrl,
} from '@/utils/hybrid-auth';

function LoadingOverlay({ label }: { label: string }) {
  return (
    <View className="absolute inset-0 items-center justify-center bg-white/90 px-6">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-center text-sm text-gray-600">{label}</Text>
    </View>
  );
}

export function WeBibleWebShell() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(WE_BIBLE_WEB_URL);
  const [hasError, setHasError] = useState(false);

  const handleAuthCallbackUrl = useCallback((url: string) => {
    const webCallbackUrl = buildWebAuthCallbackUrl(url);
    if (!webCallbackUrl) return false;

    setHasError(false);
    setCurrentUrl(webCallbackUrl);
    return true;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const pendingCallbackUrl = consumePendingAuthCallbackUrl();
      if (pendingCallbackUrl) {
        setHasError(false);
        setCurrentUrl(pendingCallbackUrl);
      }

      if (Platform.OS !== 'android') return undefined;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (!canGoBack || !webViewRef.current) return false;
          webViewRef.current.goBack();
          return true;
        }
      );

      return () => subscription.remove();
    }, [canGoBack])
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      if (request.url === 'about:blank') return true;
      if (isWeBibleWebUrl(request.url)) return true;

      if (isWeBibleAppAuthCallbackUrl(request.url)) {
        return !handleAuthCallbackUrl(request.url);
      }

      const rewrittenOAuthUrl = rewriteOAuthRedirectUrl(request.url);
      const nextUrl = rewrittenOAuthUrl ?? request.url;

      Linking.openURL(nextUrl).catch(() => undefined);
      return false;
    },
    [handleAuthCallbackUrl]
  );

  const handleReload = useCallback(() => {
    setHasError(false);
    webViewRef.current?.reload();
  }, []);

  if (hasError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-base font-semibold text-gray-900">
          페이지를 불러오지 못했습니다.
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
          네트워크 상태를 확인한 뒤 다시 시도해주세요.
        </Text>
        <Pressable
          onPress={handleReload}
          className="mt-5 rounded-full bg-blue-600 px-5 py-3 active:opacity-90"
        >
          <Text className="text-sm font-semibold text-white">다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        originWhitelist={['http://*', 'https://*']}
        allowsBackForwardNavigationGestures
        domStorageEnabled
        javaScriptEnabled
        setSupportMultipleWindows={false}
        sharedCookiesEnabled
        startInLoadingState
        renderLoading={() => <LoadingOverlay label="웹 앱을 불러오는 중입니다." />}
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
        onNavigationStateChange={(event: WebViewNavigation) => {
          setCanGoBack(event.canGoBack);
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
      />
    </View>
  );
}
