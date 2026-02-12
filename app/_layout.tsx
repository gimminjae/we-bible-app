import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppSettingsProvider, useAppSettings } from '@/contexts/app-settings';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { initBibleStateTable } from '@/utils/bible-storage';
import { initFavoriteVersesTable } from '@/utils/favorite-verses-db';
import { initMemosTable } from '@/utils/memo-db';
import type { SQLiteDatabase } from 'expo-sqlite';
import '@/global.css';

async function initDb(db: SQLiteDatabase) {
  await initFavoriteVersesTable(db);
  await initBibleStateTable(db);
  await initMemosTable(db);
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
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppSettingsProvider>
          <SQLiteProvider databaseName="we-bible.db" onInit={initDb}>
            <RootLayoutContent />
          </SQLiteProvider>
        </AppSettingsProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
