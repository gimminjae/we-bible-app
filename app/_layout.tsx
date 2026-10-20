import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ThemeVerseNotificationSync } from '@/components/theme-verse-notification-sync';
import { AppSettingsProvider, useAppSettings } from '@/contexts/app-settings';
import { appColors, featureColors } from '@/constants/app-design';
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
  const navigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: featureColors.bible[theme].ink,
      background: appColors[theme].background,
      card: appColors[theme].surface,
      text: appColors[theme].text,
      border: appColors[theme].border,
    },
  };

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
      <ThemeProvider value={navigationTheme}>
        <ToastProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="native-reader" options={{ headerShown: false, title: 'Bible Reader' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </ToastProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
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
