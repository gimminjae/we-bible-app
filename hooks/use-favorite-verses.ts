import {
  addFavorites as dbAddFavorites,
  getFavoritesForChapter,
  initFavoriteVersesTable,
  removeFavorites as dbRemoveFavorites,
  type FavoriteVerseInput,
} from '@/utils/favorite-verses-db';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

export type { FavoriteVerseInput };

type UseFavoriteVersesOptions = {
  enabled?: boolean;
};

export function useFavoriteVerses(
  bookCode: string,
  chapter: number,
  options: UseFavoriteVersesOptions = {}
) {
  const db = useSQLiteContext();
  const enabled = options.enabled ?? true;
  const [favoriteVerseNumbers, setFavoriteVerseNumbers] = useState<number[]>([]);
  const [initDone, setInitDone] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const list = await getFavoritesForChapter(db, bookCode, chapter);
      setFavoriteVerseNumbers(list);
    } catch (e) {
      setFavoriteVerseNumbers([]);
    }
  }, [db, bookCode, chapter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initFavoriteVersesTable(db);
        if (cancelled) return;
        setInitDone(true);
      } catch {
        if (!cancelled) setInitDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    if (!initDone) return;
    if (!enabled) {
      setFavoriteVerseNumbers([]);
      return;
    }
    refetch();
  }, [enabled, initDone, refetch]);

  const addVerses = useCallback(
    async (verses: FavoriteVerseInput[]) => {
      if (!enabled || verses.length === 0) return;
      await dbAddFavorites(db, bookCode, chapter, verses);
      await refetch();
    },
    [db, bookCode, chapter, enabled, refetch]
  );

  const removeVerses = useCallback(
    async (verseNumbers: number[]) => {
      if (!enabled || verseNumbers.length === 0) return;
      await dbRemoveFavorites(db, bookCode, chapter, verseNumbers);
      await refetch();
    },
    [db, bookCode, chapter, enabled, refetch]
  );

  return {
    favoriteVerseNumbers,
    addVerses,
    removeVerses,
    refetch,
  };
}
