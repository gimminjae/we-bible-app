import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AppSettingsProvider, useAppSettings } from '@/contexts/app-settings';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import '@/global.css';
import { canUseGoogleMobileAds, loadGoogleMobileAdsModule } from '@/lib/google-mobile-ads';
import { initBibleStateTable } from '@/utils/bible-storage';
import { initFavoriteVersesTable } from '@/utils/favorite-verses-db';
import { initGrassTable } from '@/utils/grass-db';
import { initMemosTable } from '@/utils/memo-db';
import { initPlansTable } from '@/utils/plan-db';
import { initPrayersTable } from '@/utils/prayer-db';

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
            <Stack.Screen name="native-reader" options={{ title: 'Bible Reader' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </ToastProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

function AuthSyncGate({ children }: { children: ReactNode }) {
  const { isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const pathname = usePathname();
  const isAuthCallbackRoute = pathname === '/auth/callback';

  if (!isAuthCallbackRoute && isConfigured && (isLoadingSession || isSyncingData)) {
    return <LoadingScreen message="Synchronizing account data..." />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SQLiteProvider databaseName="we-bible.db" onInit={initDb}>
          <AppSettingsProvider>
            <AuthProvider>
              <AuthSyncGate>
                <RootLayoutContent />
              </AuthSyncGate>
            </AuthProvider>
          </AppSettingsProvider>
        </SQLiteProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
