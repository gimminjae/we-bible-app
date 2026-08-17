import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ThemeVerseNotificationSync } from '@/components/theme-verse-notification-sync';
import { AppSettingsProvider, useAppSettings } from '@/contexts/app-settings';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import '@/global.css';
import { canUseGoogleMobileAds, loadGoogleMobileAdsModule } from '@/lib/google-mobile-ads';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { theme } = useAppSettings();

  useEffect(() => {
    if (!canUseGoogleMobileAds()) return;

    loadGoogleMobileAdsModule()
      .then((mod) => {
        if (!mod) return;
        mod.default().initialize();
      })
      .catch(() => {
        // Ignore initialization in environments without native module (e.g. Expo Go).
      });
  }, []);

  return (
    <GluestackUIProvider mode={theme}>
      <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <ToastProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="native-reader" options={{ headerShown: false, title: 'Bible Reader' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </ToastProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SQLiteProvider databaseName="we-bible.db">
          <AppSettingsProvider>
            <AuthProvider>
              <ThemeVerseNotificationSync />
              <RootLayoutContent />
            </AuthProvider>
          </AppSettingsProvider>
        </SQLiteProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
