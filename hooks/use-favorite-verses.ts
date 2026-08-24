import {
  addFavorites as dbAddFavorites,
  getFavoritesForChapter,
  removeFavorites as dbRemoveFavorites,
  type FavoriteVerseInput,
} from '@/services/favorite-verse';
import { useAuth } from '@/contexts/auth-context';
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
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const enabled = options.enabled ?? true;
  const [favoriteVerseNumbers, setFavoriteVerseNumbers] = useState<number[]>([]);
  const [isHydrating, setIsHydrating] = useState(false);

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)));

  const refetch = useCallback(async () => {
    try {
      const list = await getFavoritesForChapter(db, bookCode, chapter);
      setFavoriteVerseNumbers(list);
    } catch {
      setFavoriteVerseNumbers([]);
    }
  }, [db, bookCode, chapter]);

  useEffect(() => {
    if (!enabled) {
      setFavoriteVerseNumbers([]);
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (currentUser && isConfigured) {
        if (isAccountDataPending || dataUserId !== currentUser.id) {
          setFavoriteVerseNumbers([]);
          setIsHydrating(true);
          return;
        }
      }

      setIsHydrating(true);
      if (!cancelled) {
        try {
          await refetch();
        } finally {
          if (!cancelled) {
            setIsHydrating(false);
          }
        }
      }
    };

    void load().catch(() => {
      if (!cancelled) {
        setFavoriteVerseNumbers([]);
        setIsHydrating(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    dataUserId,
    db,
    enabled,
    isAccountDataPending,
    isConfigured,
    refetch,
  ]);

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
    isHydrating,
  };
}
