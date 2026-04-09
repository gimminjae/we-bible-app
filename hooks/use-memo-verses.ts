import {
  addMemo as dbAddMemo,
  getMemoVerseNumbersForChapter,
  initMemosTable,
} from '@/utils/memo-db';
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
  const enabled = options.enabled ?? true;
  const [memoVerseNumbers, setMemoVerseNumbers] = useState<number[]>([]);
  const [initDone, setInitDone] = useState(false);

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
      return;
    }
    refetch();
  }, [enabled, initDone, refetch]);

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
  };
}
