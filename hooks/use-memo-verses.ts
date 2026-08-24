import {
  addMemo as dbAddMemo,
  getMemoVerseNumbersForChapter,
} from '@/services/memo';
import { useAuth } from '@/contexts/auth-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

type UseMemoVersesOptions = {
  enabled?: boolean;
};

export function useMemoVerses(
  bookCode: string,
  chapter: number,
  options: UseMemoVersesOptions = {}
) {
  const db = useSQLiteContext();
  const { currentUser, dataUserId, isConfigured, isLoadingSession, isSyncingData } = useAuth();
  const enabled = options.enabled ?? true;
  const [memoVerseNumbers, setMemoVerseNumbers] = useState<number[]>([]);
  const [isHydrating, setIsHydrating] = useState(false);

  const isAccountDataPending =
    isConfigured &&
    (isLoadingSession ||
      (currentUser !== null && (isSyncingData || dataUserId !== currentUser.id)));

  const refetch = useCallback(async () => {
    try {
      const list = await getMemoVerseNumbersForChapter(db, bookCode, chapter);
      setMemoVerseNumbers(list);
    } catch {
      setMemoVerseNumbers([]);
    }
  }, [db, bookCode, chapter]);

  useEffect(() => {
    if (!enabled) {
      setMemoVerseNumbers([]);
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (currentUser && isConfigured) {
        if (isAccountDataPending || dataUserId !== currentUser.id) {
          setMemoVerseNumbers([]);
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
        setMemoVerseNumbers([]);
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

  const addMemo = useCallback(
    async (title: string, content: string, verseText: string, verseNumbers: number[]) => {
      if (!enabled || verseNumbers.length === 0) return;
      await dbAddMemo(db, title, content, verseText, bookCode, chapter, verseNumbers);
      await refetch();
    },
    [db, bookCode, chapter, enabled, refetch]
  );

  return {
    memoVerseNumbers,
    addMemo,
    refetch,
    isHydrating,
  };
}
