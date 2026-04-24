import { padNumber } from '@/lib/date';
import { getBookName } from '@/services/bible';
import {
  getBibleMeditationNotificationEnabledFromDb,
  getBibleMeditationNotificationTimeFromDb,
  getBibleMeditationNotificationScheduleIdsFromDb,
  getAppLanguageFromDb,
  getThemeVerseNotificationPermissionRequestedFromDb,
  getThemeVerseNotificationScheduleIdsFromDb,
  getThemeVerseNotificationSettingsFromDb,
  type AppLanguage,
  setBibleMeditationNotificationScheduleIdsToDb,
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
const BIBLE_MEDITATION_NOTIFICATION_KIND = 'bibleMeditationReminder';
const BIBLE_MEDITATION_NOTIFICATION_CHANNEL_ID = 'bible-meditation-reminder';

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

async function ensureBibleMeditationNotificationChannel(
  appLanguage: AppLanguage,
): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(BIBLE_MEDITATION_NOTIFICATION_CHANNEL_ID, {
    name: appLanguage === 'en' ? 'Bible Meditation Reminder' : '성경 묵상 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

async function getScheduledNotificationIdsFromSystem(kind: string): Promise<string[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();

  return requests
    .filter((request) => {
      const value =
        request.content.data &&
        typeof request.content.data === 'object' &&
        'notificationKind' in request.content.data
          ? request.content.data.notificationKind
          : null;

      return value === kind;
    })
    .map((request) => request.identifier);
}

async function getScheduledThemeVerseNotificationIdsFromSystem(): Promise<string[]> {
  return getScheduledNotificationIdsFromSystem(THEME_VERSE_NOTIFICATION_KIND);
}

async function getScheduledBibleMeditationNotificationIdsFromSystem(): Promise<string[]> {
  return getScheduledNotificationIdsFromSystem(BIBLE_MEDITATION_NOTIFICATION_KIND);
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

export async function requestLocalNotificationPermissions(): Promise<boolean> {
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

export async function requestThemeVerseNotificationPermissions(): Promise<boolean> {
  return requestLocalNotificationPermissions();
}

export async function requestLocalNotificationPermissionsOnFirstLaunch(
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

    const granted = await requestLocalNotificationPermissions();
    await setThemeVerseNotificationPermissionRequestedToDb(db, true);
    return granted;
  } catch {
    await setThemeVerseNotificationPermissionRequestedToDb(db, true);
    return false;
  }
}

export async function requestThemeVerseNotificationPermissionsOnFirstLaunch(
  db: SQLiteDatabase,
): Promise<boolean> {
  return requestLocalNotificationPermissionsOnFirstLaunch(db);
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

export async function cancelBibleMeditationNotificationSchedule(
  db: SQLiteDatabase,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const [storedIds, scheduledIds] = await Promise.all([
    getBibleMeditationNotificationScheduleIdsFromDb(db),
    getScheduledBibleMeditationNotificationIdsFromSystem().catch(() => []),
  ]);

  const ids = [...new Set([...storedIds, ...scheduledIds])];

  await Promise.all(
    ids.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined),
    ),
  );

  await setBibleMeditationNotificationScheduleIdsToDb(db, []);
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

export type BibleMeditationNotificationSyncReason =
  | 'disabled'
  | 'missingPermission'
  | 'scheduled'
  | 'unsupported';

export type BibleMeditationNotificationSyncResult = {
  reason: BibleMeditationNotificationSyncReason;
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

function buildBibleMeditationNotificationTitle(appLanguage: AppLanguage): string {
  return appLanguage === 'en' ? 'Did you read the Bible today?' : '오늘 성경 읽으셨나요?';
}

function buildBibleMeditationNotificationBody(appLanguage: AppLanguage): string {
  return appLanguage === 'en'
    ? 'Feed your soul with the Word of God every day!'
    : '마음의 양식도 채우는 것도 아주 중요합니다!';
}

export async function syncBibleMeditationNotificationSchedule(
  db: SQLiteDatabase,
  options?: { appLanguage?: AppLanguage | null },
): Promise<BibleMeditationNotificationSyncResult> {
  if (Platform.OS === 'web') {
    return { reason: 'unsupported', scheduledCount: 0 };
  }

  const [enabled, notificationTime, appLanguage] = await Promise.all([
    getBibleMeditationNotificationEnabledFromDb(db),
    getBibleMeditationNotificationTimeFromDb(db),
    options?.appLanguage
      ? Promise.resolve(options.appLanguage)
      : getAppLanguageFromDb(db),
  ]);

  if (!enabled) {
    await cancelBibleMeditationNotificationSchedule(db);
    return { reason: 'disabled', scheduledCount: 0 };
  }

  const hasPermission = await getThemeVerseNotificationPermissionGranted();
  if (!hasPermission) {
    await cancelBibleMeditationNotificationSchedule(db);
    return { reason: 'missingPermission', scheduledCount: 0 };
  }

  await cancelBibleMeditationNotificationSchedule(db);

  const resolvedLanguage = appLanguage ?? 'ko';
  await ensureBibleMeditationNotificationChannel(resolvedLanguage);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: buildBibleMeditationNotificationTitle(resolvedLanguage),
      body: buildBibleMeditationNotificationBody(resolvedLanguage),
      sound: 'default',
      data: {
        notificationKind: BIBLE_MEDITATION_NOTIFICATION_KIND,
        route: '/',
        time: `${padNumber(notificationTime.hour)}:${padNumber(notificationTime.minute)}`,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: notificationTime.hour,
      minute: notificationTime.minute,
      channelId:
        Platform.OS === 'android' ? BIBLE_MEDITATION_NOTIFICATION_CHANNEL_ID : undefined,
    },
  });

  await setBibleMeditationNotificationScheduleIdsToDb(db, [identifier]);

  return { reason: 'scheduled', scheduledCount: 1 };
}
