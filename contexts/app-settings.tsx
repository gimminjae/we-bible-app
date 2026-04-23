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
  DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS,
  getAppLanguageFromDb,
  getAppThemeFromDb,
  getThemeVerseNotificationSettingsFromDb,
  normalizeThemeVerseNotificationSettings,
  setAppLanguageToDb,
  setAppThemeToDb,
  setThemeVerseNotificationSettingsToDb,
  type AppTheme,
  type ThemeVerseNotificationSettings,
} from '@/utils/bible-storage';
import {
  getStoredAppLanguage,
  getStoredTheme,
  setStoredAppLanguage,
  setStoredTheme,
  type AppLanguage,
} from '@/utils/app-settings-storage';

type AppSettingsValue = {
  isReady: boolean;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  appLanguage: AppLanguage;
  setAppLanguage: (lang: AppLanguage) => void;
  themeVerseNotificationSettings: ThemeVerseNotificationSettings;
  setThemeVerseNotificationSettings: (
    settings: ThemeVerseNotificationSettings,
  ) => Promise<void>;
  refreshSettings: () => Promise<void>;
};

export const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const systemColorScheme = useRNColorScheme();
  const [isReady, setIsReady] = useState(false);
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
  const [themeVerseNotificationSettings, setThemeVerseNotificationSettingsState] =
    useState<ThemeVerseNotificationSettings>(DEFAULT_THEME_VERSE_NOTIFICATION_SETTINGS);

  const refreshSettings = useCallback(async () => {
    const [storedTheme, storedAppLanguage, storedThemeVerseNotificationSettings] = await Promise.all([
      getAppThemeFromDb(db),
      getAppLanguageFromDb(db),
      getThemeVerseNotificationSettingsFromDb(db),
    ]);
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    if (storedAppLanguage) {
      setAppLanguageState(storedAppLanguage);
    }
    setThemeVerseNotificationSettingsState(storedThemeVerseNotificationSettings);
    setIsReady(true);
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    refreshSettings().catch(() => {
      if (!cancelled) {
        setIsReady(true);
      }
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

  const setThemeVerseNotificationSettings = useCallback(
    async (next: ThemeVerseNotificationSettings) => {
      const normalized = normalizeThemeVerseNotificationSettings(next);
      await setThemeVerseNotificationSettingsToDb(db, normalized);
      setThemeVerseNotificationSettingsState(normalized);
    },
    [db],
  );

  const value: AppSettingsValue = {
    isReady,
    theme,
    setTheme,
    appLanguage,
    setAppLanguage,
    themeVerseNotificationSettings,
    setThemeVerseNotificationSettings,
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
