import { padNumber } from '@/lib/date';
import { getBookName } from '@/services/bible';
import {
  getAppLanguageFromDb,
  getThemeVerseNotificationPermissionRequestedFromDb,
  getThemeVerseNotificationScheduleIdsFromDb,
  getThemeVerseNotificationSettingsFromDb,
  type AppLanguage,
  setThemeVerseNotificationPermissionRequestedToDb,
  setThemeVerseNotificationScheduleIdsToDb,
} from '@/utils/bible-storage';
import {
  formatThemeVerseNumbers,
  getCurrentThemeVerseYear,
  getThemeVerseByYear,
} from '@/utils/theme-verse-db';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const THEME_VERSE_NOTIFICATION_KIND = 'themeVerseReminder';
const THEME_VERSE_NOTIFICATION_CHANNEL_ID = 'theme-verse-reminder';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function hasGrantedNotificationPermission(
  status: Notifications.NotificationPermissionsStatus,
): boolean {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function buildThemeVerseNotificationTitle(appLanguage: AppLanguage): string {
  return appLanguage === 'en' ? "Remember Your Theme Verse" : '당신의 푯대말씀을 기억하세요';
}

function buildThemeVerseNotificationChannelName(appLanguage: AppLanguage): string {
  return appLanguage === 'en' ? 'Theme Verse Reminder' : '푯대말씀 알림';
}

async function ensureThemeVerseNotificationChannel(appLanguage: AppLanguage): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(THEME_VERSE_NOTIFICATION_CHANNEL_ID, {
    name: buildThemeVerseNotificationChannelName(appLanguage),
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

async function getScheduledThemeVerseNotificationIdsFromSystem(): Promise<string[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();

  return requests
    .filter((request) => {
      const value =
        request.content.data &&
        typeof request.content.data === 'object' &&
        'notificationKind' in request.content.data
          ? request.content.data.notificationKind
          : null;

      return value === THEME_VERSE_NOTIFICATION_KIND;
    })
    .map((request) => request.identifier);
}

export async function getThemeVerseNotificationPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const status = await Notifications.getPermissionsAsync();
    return hasGrantedNotificationPermission(status);
  } catch {
    return false;
  }
}

export async function requestThemeVerseNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const status = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    return hasGrantedNotificationPermission(status);
  } catch {
    return false;
  }
}

export async function requestThemeVerseNotificationPermissionsOnFirstLaunch(
  db: SQLiteDatabase,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const alreadyRequested = await getThemeVerseNotificationPermissionRequestedFromDb(db);
  if (alreadyRequested) {
    return getThemeVerseNotificationPermissionGranted();
  }

  try {
    const currentStatus = await Notifications.getPermissionsAsync();
    if (hasGrantedNotificationPermission(currentStatus)) {
      await setThemeVerseNotificationPermissionRequestedToDb(db, true);
      return true;
    }

    if (!currentStatus.canAskAgain) {
      await setThemeVerseNotificationPermissionRequestedToDb(db, true);
      return false;
    }

    const granted = await requestThemeVerseNotificationPermissions();
    await setThemeVerseNotificationPermissionRequestedToDb(db, true);
    return granted;
  } catch {
    await setThemeVerseNotificationPermissionRequestedToDb(db, true);
    return false;
  }
}

export async function cancelThemeVerseNotificationSchedule(
  db: SQLiteDatabase,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const [storedIds, scheduledIds] = await Promise.all([
    getThemeVerseNotificationScheduleIdsFromDb(db),
    getScheduledThemeVerseNotificationIdsFromSystem().catch(() => []),
  ]);

  const ids = [...new Set([...storedIds, ...scheduledIds])];

  await Promise.all(
    ids.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined),
    ),
  );

  await setThemeVerseNotificationScheduleIdsToDb(db, []);
}

function buildThemeVerseNotificationBody(
  themeVerse: NonNullable<Awaited<ReturnType<typeof getThemeVerseByYear>>>,
  appLanguage: AppLanguage,
): string {
  const citation = `${getBookName(themeVerse.bookCode, appLanguage)} ${themeVerse.chapter}:${formatThemeVerseNumbers(themeVerse.verseNumbers)}`;
  const description = themeVerse.description.trim();

  if (!description) {
    return `${themeVerse.verseText}\n${citation}`.trim();
  }

  return `${themeVerse.verseText}\n${citation}\n\n${description}`.trim();
}

export type ThemeVerseNotificationSyncReason =
  | 'disabled'
  | 'missingPermission'
  | 'missingThemeVerse'
  | 'missingWeekdays'
  | 'scheduled'
  | 'unsupported';

export type ThemeVerseNotificationSyncResult = {
  reason: ThemeVerseNotificationSyncReason;
  scheduledCount: number;
};

export async function syncThemeVerseNotificationSchedule(
  db: SQLiteDatabase,
  options?: { appLanguage?: AppLanguage | null },
): Promise<ThemeVerseNotificationSyncResult> {
  if (Platform.OS === 'web') {
    return { reason: 'unsupported', scheduledCount: 0 };
  }

  const [settings, appLanguage] = await Promise.all([
    getThemeVerseNotificationSettingsFromDb(db),
    options?.appLanguage
      ? Promise.resolve(options.appLanguage)
      : getAppLanguageFromDb(db),
  ]);

  if (!settings.enabled) {
    await cancelThemeVerseNotificationSchedule(db);
    return { reason: 'disabled', scheduledCount: 0 };
  }

  if (settings.weekdays.length === 0) {
    await cancelThemeVerseNotificationSchedule(db);
    return { reason: 'missingWeekdays', scheduledCount: 0 };
  }

  const hasPermission = await getThemeVerseNotificationPermissionGranted();
  if (!hasPermission) {
    await cancelThemeVerseNotificationSchedule(db);
    return { reason: 'missingPermission', scheduledCount: 0 };
  }

  const themeVerse = await getThemeVerseByYear(db, getCurrentThemeVerseYear());
  if (!themeVerse?.verseText.trim()) {
    await cancelThemeVerseNotificationSchedule(db);
    return { reason: 'missingThemeVerse', scheduledCount: 0 };
  }

  await cancelThemeVerseNotificationSchedule(db);

  const resolvedLanguage = appLanguage ?? 'ko';
  await ensureThemeVerseNotificationChannel(resolvedLanguage);

  const identifiers: string[] = [];

  for (const weekday of settings.weekdays) {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: buildThemeVerseNotificationTitle(resolvedLanguage),
        body: buildThemeVerseNotificationBody(themeVerse, resolvedLanguage),
        sound: 'default',
        data: {
          notificationKind: THEME_VERSE_NOTIFICATION_KIND,
          route: '/(tabs)/mypage/theme-verse',
          year: String(themeVerse.year),
          time: `${padNumber(settings.hour)}:${padNumber(settings.minute)}`,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: settings.hour,
        minute: settings.minute,
        channelId:
          Platform.OS === 'android' ? THEME_VERSE_NOTIFICATION_CHANNEL_ID : undefined,
      },
    });

    identifiers.push(identifier);
  }

  await setThemeVerseNotificationScheduleIdsToDb(db, identifiers);

  return { reason: 'scheduled', scheduledCount: identifiers.length };
}
