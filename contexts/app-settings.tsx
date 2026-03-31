'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Platform, useColorScheme as useRNColorScheme } from 'react-native';
import {
  getAppLanguageFromDb,
  getAppThemeFromDb,
  setAppLanguageToDb,
  setAppThemeToDb,
  type AppTheme,
} from '@/utils/bible-storage';
import {
  getStoredAppLanguage,
  getStoredTheme,
  setStoredAppLanguage,
  setStoredTheme,
  type AppLanguage,
} from '@/utils/app-settings-storage';

type AppSettingsValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  appLanguage: AppLanguage;
  setAppLanguage: (lang: AppLanguage) => void;
  refreshSettings: () => Promise<void>;
};

export const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const systemColorScheme = useRNColorScheme();
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (Platform.OS === 'web') {
      const fromCookie = getStoredTheme();
      if (fromCookie) return fromCookie;
    }
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  });
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>(() => {
    const stored = getStoredAppLanguage();
    return stored ?? 'ko';
  });

  const refreshSettings = useCallback(async () => {
    const [storedTheme, storedAppLanguage] = await Promise.all([
      getAppThemeFromDb(db),
      getAppLanguageFromDb(db),
    ]);
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    if (storedAppLanguage) {
      setAppLanguageState(storedAppLanguage);
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    refreshSettings().catch(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refreshSettings]);

  const setTheme = useCallback(
    (next: AppTheme) => {
      setThemeState(next);
      setStoredTheme(next);
      void setAppThemeToDb(db, next);
    },
    [db]
  );

  const setAppLanguage = useCallback((next: AppLanguage) => {
    setAppLanguageState(next);
    setStoredAppLanguage(next);
    void setAppLanguageToDb(db, next);
  }, [db]);

  const value: AppSettingsValue = {
    theme,
    setTheme,
    appLanguage,
    setAppLanguage,
    refreshSettings,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}

export function useOptionalAppSettings(): AppSettingsValue | null {
  return useContext(AppSettingsContext);
}
