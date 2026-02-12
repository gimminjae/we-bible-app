import {
  addFavorites as dbAddFavorites,
  getFavoritesForChapter,
  initFavoriteVersesTable,
  removeFavorites as dbRemoveFavorites,
} from '@/utils/favorite-verses-db';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

export function useFavoriteVerses(bookCode: string, chapter: number) {
  const db = useSQLiteContext();
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
    refetch();
  }, [initDone, refetch]);

  const addVerses = useCallback(
    async (verseNumbers: number[]) => {
      if (verseNumbers.length === 0) return;
      await dbAddFavorites(db, bookCode, chapter, verseNumbers);
      await refetch();
    },
    [db, bookCode, chapter, refetch]
  );

  const removeVerses = useCallback(
    async (verseNumbers: number[]) => {
      if (verseNumbers.length === 0) return;
      await dbRemoveFavorites(db, bookCode, chapter, verseNumbers);
      await refetch();
    },
    [db, bookCode, chapter, refetch]
  );

  return {
    favoriteVerseNumbers,
    addVerses,
    removeVerses,
    refetch,
  };
}
