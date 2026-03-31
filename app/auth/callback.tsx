import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { createSupabaseClient } from '@/lib/supabase-client';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const getParam = (key: string) => {
      const value = params[key];
      return typeof value === 'string' ? value : value?.[0];
    };

    const code = getParam('code');
    const accessToken = getParam('access_token');
    const refreshToken = getParam('refresh_token');

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
  }, [params, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-950">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
        Signing you in...
      </Text>
    </View>
  );
}
