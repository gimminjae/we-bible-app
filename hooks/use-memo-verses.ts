import {
  addMemo as dbAddMemo,
  getMemoVerseNumbersForChapter,
  initMemosTable,
} from '@/utils/memo-db';
import { useAuth } from '@/contexts/auth-context';
import { ensurePersistedSlicesHydrated } from '@/lib/sqlite-supabase-store';
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
  const [initDone, setInitDone] = useState(false);
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
    let cancelled = false;
    (async () => {
      try {
        await initMemosTable(db);
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

        setIsHydrating(true);
        try {
          await ensurePersistedSlicesHydrated(db, currentUser.id, ['memos']);
          if (cancelled) return;
        } finally {
          if (!cancelled) {
            setIsHydrating(false);
          }
        }
      } else {
        setIsHydrating(false);
      }

      if (!cancelled) {
        await refetch();
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
    initDone,
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
