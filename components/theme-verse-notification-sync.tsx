import { useAppSettings } from '@/contexts/app-settings';
import {
  requestThemeVerseNotificationPermissionsOnFirstLaunch,
  syncThemeVerseNotificationSchedule,
} from '@/lib/theme-verse-notifications';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

export function ThemeVerseNotificationSync() {
  const db = useSQLiteContext();
  const { appLanguage, isReady, themeVerseNotificationSettings } = useAppSettings();
  const initialPermissionCheckedRef = useRef(false);

  useEffect(() => {
    if (
      Platform.OS === 'web' ||
      !isReady ||
      !themeVerseNotificationSettings.enabled ||
      initialPermissionCheckedRef.current
    ) {
      return;
    }

    initialPermissionCheckedRef.current = true;

    void requestThemeVerseNotificationPermissionsOnFirstLaunch(db)
      .then(() => syncThemeVerseNotificationSchedule(db, { appLanguage }))
      .catch(() => {
        // Ignore permission prompt failures so app startup is not blocked.
      });
  }, [appLanguage, db, isReady, themeVerseNotificationSettings.enabled]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isReady) return;

    void syncThemeVerseNotificationSchedule(db, { appLanguage }).catch(() => {
      // Ignore notification sync failures to avoid blocking app startup.
    });
  }, [appLanguage, db, isReady, themeVerseNotificationSettings]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isReady) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      void syncThemeVerseNotificationSchedule(db, { appLanguage }).catch(() => {
        // Ignore permission or scheduler errors on resume.
      });
    });

    return () => {
      subscription.remove();
    };
  }, [appLanguage, db, isReady]);

  return null;
}
