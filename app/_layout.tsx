import '../global.css';

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
import { initPlansTable } from '@/utils/plan-db';
import { initPrayersTable } from '@/utils/prayer-db';
import type { SQLiteDatabase } from 'expo-sqlite';

async function initDb(db: SQLiteDatabase) {
  await initFavoriteVersesTable(db);
  await initBibleStateTable(db);
  await initMemosTable(db);
  await initPlansTable(db);
  await initPrayersTable(db);
}

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { theme } = useAppSettings();

  return (
    <GluestackUIProvider mode={theme}>
      <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <ToastProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
