import type { BibleSearchInfo } from '@/components/bible/types';

const BIBLE_SEARCH_INFO_KEY = 'bibleSearchInfo';
const MAX_AGE = 60 * 60 * 24 * 365; // 1년

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

export async function getBibleSearchInfo(): Promise<BibleSearchInfo | null> {
  const raw = getCookie(BIBLE_SEARCH_INFO_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BibleSearchInfo;
    if (
      typeof parsed?.bookCode === 'string' &&
      typeof parsed?.chapter === 'number' &&
      typeof parsed?.primaryLang === 'string' &&
      typeof parsed?.fontScale === 'number' &&
      typeof parsed?.dualLang === 'boolean' &&
      typeof parsed?.secondaryLang === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setBibleSearchInfo(info: BibleSearchInfo): Promise<void> {
  setCookie(BIBLE_SEARCH_INFO_KEY, JSON.stringify(info));
}
