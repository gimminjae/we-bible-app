import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { createSupabaseClient } from '@/lib/supabase-client';
import { isSupabaseConfigured } from '@/lib/supabase';

function getParamValue(
  params: Record<string, string | string[]>,
  key: string,
): string | null {
  const value = params[key];
  if (typeof value === 'string') return value;
  return value?.[0] ?? null;
}

function parseAuthResultUrl(url: string) {
  try {
    const parsed = new URL(url);
    const searchParams = new URLSearchParams(parsed.search);
    const hashParams = new URLSearchParams(
      parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash,
    );

    return {
      code: searchParams.get('code') ?? hashParams.get('code'),
      accessToken:
        hashParams.get('access_token') ?? searchParams.get('access_token'),
      refreshToken:
        hashParams.get('refresh_token') ?? searchParams.get('refresh_token'),
    };
  } catch {
    return {
      code: null,
      accessToken: null,
      refreshToken: null,
    };
  }
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

      const supabase = createSupabaseClient();

      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
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
