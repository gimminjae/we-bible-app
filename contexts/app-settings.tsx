'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import {
  getStoredAppLanguage,
  getStoredTheme,
  setStoredAppLanguage,
  setStoredTheme,
  type AppLanguage,
  type AppTheme,
} from '@/utils/app-settings-storage';

type AppSettingsValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  appLanguage: AppLanguage;
  setAppLanguage: (lang: AppLanguage) => void;
};

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const stored = getStoredTheme();
    if (stored) return stored;
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  });
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>(() => {
    const stored = getStoredAppLanguage();
    return stored ?? 'ko';
  });

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    setStoredTheme(next);
  }, []);

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
