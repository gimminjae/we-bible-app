import { useAppSettings } from '@/contexts/app-settings';
import {
  requestLocalNotificationPermissionsOnFirstLaunch,
  syncBibleMeditationNotificationSchedule,
  syncThemeVerseNotificationSchedule,
} from '@/lib/theme-verse-notifications';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

export function ThemeVerseNotificationSync() {
  const db = useSQLiteContext();
  const {
    appLanguage,
    bibleMeditationNotificationEnabled,
    isReady,
    themeVerseNotificationSettings,
  } = useAppSettings();
  const initialPermissionCheckedRef = useRef(false);

  useEffect(() => {
    if (
      Platform.OS === 'web' ||
      !isReady ||
      (!themeVerseNotificationSettings.enabled && !bibleMeditationNotificationEnabled) ||
      initialPermissionCheckedRef.current
    ) {
      return;
    }

    initialPermissionCheckedRef.current = true;

    void requestLocalNotificationPermissionsOnFirstLaunch(db)
      .then(async () => {
        await Promise.all([
          syncThemeVerseNotificationSchedule(db, { appLanguage }),
          syncBibleMeditationNotificationSchedule(db, { appLanguage }),
        ]);
      })
      .catch(() => {
        // Ignore permission prompt failures so app startup is not blocked.
      });
  }, [
    appLanguage,
    bibleMeditationNotificationEnabled,
    db,
    isReady,
    themeVerseNotificationSettings.enabled,
  ]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isReady) return;

    void Promise.all([
      syncThemeVerseNotificationSchedule(db, { appLanguage }),
      syncBibleMeditationNotificationSchedule(db, { appLanguage }),
    ]).catch(() => {
      // Ignore notification sync failures to avoid blocking app startup.
    });
  }, [
    appLanguage,
    bibleMeditationNotificationEnabled,
    db,
    isReady,
    themeVerseNotificationSettings,
  ]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isReady) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      void Promise.all([
        syncThemeVerseNotificationSchedule(db, { appLanguage }),
        syncBibleMeditationNotificationSchedule(db, { appLanguage }),
      ]).catch(() => {
        // Ignore permission or scheduler errors on resume.
      });
    });

    return () => {
      subscription.remove();
    };
  }, [appLanguage, db, isReady]);

  return null;
}
