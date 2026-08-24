import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { isSupabaseConfigured } from '@/lib/supabase';
import {
  exchangeAuthCodeForSession,
  parseAuthResultUrl,
  setAuthSession,
} from '@/services/auth';

function getParamValue(
  params: Record<string, string | string[]>,
  key: string,
): string | null {
  const value = params[key];
  if (typeof value === 'string') return value;
  return value?.[0] ?? null;
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const currentUrl = Linking.useURL();
  const router = useRouter();
  const authResult = useMemo(() => {
    const urlParams = currentUrl ? parseAuthResultUrl(currentUrl) : null;

    return {
      code: urlParams?.code ?? getParamValue(params, 'code'),
      accessToken: urlParams?.accessToken ?? getParamValue(params, 'access_token'),
      refreshToken: urlParams?.refreshToken ?? getParamValue(params, 'refresh_token'),
    };
  }, [currentUrl, params]);

  useEffect(() => {
    let active = true;
    const { code, accessToken, refreshToken } = authResult;

    const completeAuth = async () => {
      if (!isSupabaseConfigured()) {
        if (active) router.replace('/(tabs)/settings');
        return;
      }

      try {
        if (code) {
          await exchangeAuthCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await setAuthSession(accessToken, refreshToken);
        }
      } catch {
        // Ignore and let the auth context surface any error state.
      } finally {
        if (active) {
          router.replace('/(tabs)/settings');
        }
      }
    };

    void completeAuth();

    return () => {
      active = false;
    };
  }, [authResult, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-950">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
        Signing you in...
      </Text>
    </View>
  );
}
