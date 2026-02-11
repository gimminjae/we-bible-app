import type { BibleVerse } from '@/domain/bible/bible';
import bibleService from '@/services/bible';
import type { BibleLang } from '@/components/bible/types';
import type { DisplayVerse } from '@/components/bible/types';
import { useCustomQuery } from '@/hooks/use-custom-query';

/** 성경 데이터는 변경되지 않으므로 장기 캐시 (1년) */
const BIBLE_STALE_TIME = 1000 * 60 * 60 * 24 * 365;
const BIBLE_GC_TIME = 1000 * 60 * 60 * 24 * 365;

export type UseBibleQueryParams = {
  bookCode: string;
  chapter: number;
  primaryLang: BibleLang;
  dualLang: boolean;
  secondaryLang: BibleLang;
};

function normalizeToDisplayVerse(
  primary: BibleVerse[],
  secondary?: BibleVerse[]
): DisplayVerse[] {
  const normalizedPrimary = Array.isArray(primary) ? primary : [];
  const normalizedSecondary = Array.isArray(secondary) ? secondary : [];
  return normalizedPrimary.map((p, index) => ({
    verse: p.verse ?? index + 1,
    primary: p.content ?? '',
    ...(normalizedSecondary[index] != null && {
      secondary: normalizedSecondary[index]?.content ?? '',
    }),
  }));
}

async function fetchBibleVerses(params: UseBibleQueryParams): Promise<DisplayVerse[]> {
  const { bookCode, chapter, primaryLang, dualLang, secondaryLang } = params;

  if (dualLang) {
    const [primaryData, secondaryData] = await Promise.all([
      bibleService.getBible({ bookCode, chapter, lang: primaryLang }),
      bibleService.getBible({ bookCode, chapter, lang: secondaryLang }),
    ]);
    const primary: BibleVerse[] = Array.isArray(primaryData) ? primaryData : [];
    const secondary: BibleVerse[] = Array.isArray(secondaryData) ? secondaryData : [];
    return normalizeToDisplayVerse(primary, secondary);
  }

  const data = await bibleService.getBible({ bookCode, chapter, lang: primaryLang });
  const normalized: BibleVerse[] = Array.isArray(data) ? data : [];
  return normalizeToDisplayVerse(normalized);
}

export function useBibleQuery(params: UseBibleQueryParams) {
  const { bookCode, chapter, primaryLang, dualLang, secondaryLang } = params;

  return useCustomQuery({
    queryKey: ['bible', bookCode, chapter, primaryLang, dualLang, secondaryLang],
    queryFn: () => fetchBibleVerses(params),
    staleTime: BIBLE_STALE_TIME,
    gcTime: BIBLE_GC_TIME,
  });
}
