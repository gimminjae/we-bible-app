import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AppSettingsProvider, useAppSettings } from '@/contexts/app-settings';
import { ToastProvider } from '@/contexts/toast-context';
import '@/global.css';
import { initBibleStateTable } from '@/utils/bible-storage';
import { initFavoriteVersesTable } from '@/utils/favorite-verses-db';
import { initMemosTable } from '@/utils/memo-db';
import { initGrassTable } from '@/utils/grass-db';
import { initPlansTable } from '@/utils/plan-db';
import { initPrayersTable } from '@/utils/prayer-db';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { NativeModules } from 'react-native';

async function initDb(db: SQLiteDatabase) {
  await initFavoriteVersesTable(db);
  await initBibleStateTable(db);
  await initMemosTable(db);
  await initPlansTable(db);
  await initPrayersTable(db);
  await initGrassTable(db);
}

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { theme } = useAppSettings();
  useEffect(() => {
    if (!NativeModules.RNGoogleMobileAdsModule) return;
    import('react-native-google-mobile-ads')
      .then((mod) => {
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
            <Stack.Screen name="native-reader" options={{ title: '앱 리더' }} />
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
        <SQLiteProvider databaseName="we-bible.db" onInit={initDb}>
          <AppSettingsProvider>
            <RootLayoutContent />
          </AppSettingsProvider>
        </SQLiteProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
