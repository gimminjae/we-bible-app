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
  getAppThemeFromDb,
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
};

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    getAppThemeFromDb(db).then((stored) => {
      if (cancelled) return;
      if (stored) setThemeState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setTheme = useCallback(
    (next: AppTheme) => {
      setThemeState(next);
      setStoredTheme(next);
      setAppThemeToDb(db, next);
    },
    [db]
  );

  const setAppLanguage = useCallback((next: AppLanguage) => {
    setAppLanguageState(next);
    setStoredAppLanguage(next);
  }, []);

  const value: AppSettingsValue = {
    theme,
    setTheme,
    appLanguage,
    setAppLanguage,
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
