const APP_THEME_KEY = 'appTheme';
const APP_LANGUAGE_KEY = 'appLanguage';
const MAX_AGE = 60 * 60 * 24 * 365;

function getCookie(key: string): string | null {
  if (typeof document === 'undefined' || typeof document.cookie === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${key}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(key.length + 1));
  } catch {
    return null;
  }
}

function setCookie(key: string, value: string): void {
  if (typeof document === 'undefined' || typeof document.cookie === 'undefined') return;
  document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=${MAX_AGE};samesite=lax`;
}

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'ko' | 'en';

export function getStoredTheme(): AppTheme | null {
  const raw = getCookie(APP_THEME_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

export function setStoredTheme(theme: AppTheme): void {
  setCookie(APP_THEME_KEY, theme);
}

export function getStoredAppLanguage(): AppLanguage | null {
  const raw = getCookie(APP_LANGUAGE_KEY);
  if (raw === 'ko' || raw === 'en') return raw;
  return null;
}

export function setStoredAppLanguage(lang: AppLanguage): void {
  setCookie(APP_LANGUAGE_KEY, lang);
}
