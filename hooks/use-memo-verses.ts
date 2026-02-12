import {
  addMemo as dbAddMemo,
  getMemoVerseNumbersForChapter,
  initMemosTable,
} from '@/utils/memo-db';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

export function useMemoVerses(bookCode: string, chapter: number) {
  const db = useSQLiteContext();
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
    refetch();
  }, [initDone, refetch]);

  const addMemo = useCallback(
    async (title: string, content: string, verseText: string, verseNumbers: number[]) => {
      if (verseNumbers.length === 0) return;
      await dbAddMemo(db, title, content, verseText, bookCode, chapter, verseNumbers);
      await refetch();
    },
    [db, bookCode, chapter, refetch]
  );

  return {
    memoVerseNumbers,
    addMemo,
    refetch,
  };
}
