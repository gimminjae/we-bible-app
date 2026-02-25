import { useAuth } from '@/contexts/auth-context';
import { setLastAutoSyncAtToDb } from '@/utils/bible-storage';
import {
  exportSQLiteJson,
  importSQLiteDataFromJson,
} from '@/utils/db-export';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const UPLOAD_API_BASE = 'https://qclmg1xbkl.execute-api.us-east-1.amazonaws.com/stage-1/';
const S3_SYNC_BASE = 'https://webible.s3.ap-northeast-2.amazonaws.com/users-sqlite-file';

function getUserId(sessionUserId: string | undefined): string | null {
  return sessionUserId?.trim() ? sessionUserId : null;
}

function nowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function AutoSyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const syncingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const uploadToS3Api = useCallback(async (userId: string) => {
    const url = `${UPLOAD_API_BASE}?userId=${encodeURIComponent(userId)}`;
    const content = await exportSQLiteJson(db);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: content,
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
  }, [db]);

  const syncOnAppLeave = useCallback(async (userId: string) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      await uploadToS3Api(userId);
      await setLastAutoSyncAtToDb(db, nowString());
    } catch (error) {
      console.warn('[auto-sync] upload failed', error);
    } finally {
      syncingRef.current = false;
    }
  }, [db, uploadToS3Api]);

  const pullFromS3OnLogin = useCallback(async (userId: string) => {
    try {
      const url = `${S3_SYNC_BASE}/${encodeURIComponent(userId)}.json`;
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 404) return;
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const raw = await response.text();
      if (!raw.trim()) return;
      await importSQLiteDataFromJson(db, raw);
    } catch (error) {
      console.warn('[auto-sync] download/import failed', error);
    }
  }, [db]);

  useEffect(() => {
    const currentUserId = getUserId(session?.user?.id);
    const prevUserId = prevUserIdRef.current;

    // 최초 마운트 시점은 import를 트리거하지 않고 기준값만 설정.
    if (!initializedRef.current) {
      prevUserIdRef.current = currentUserId;
      initializedRef.current = true;
      return;
    }

    // 비로그인 -> 로그인 전환일 때만 import 동기화.
    if (!prevUserId && currentUserId) {
      void pullFromS3OnLogin(currentUserId);
    }
    prevUserIdRef.current = currentUserId;
  }, [session?.user?.id, pullFromS3OnLogin]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      const userId = getUserId(session?.user?.id);
      if (!userId) return;

      const leavingApp =
        prevState === 'active' && (nextState === 'background' || nextState === 'inactive');
      if (leavingApp) {
        void syncOnAppLeave(userId);
      }
    });

    return () => {
      sub.remove();
    };
  }, [session?.user?.id, syncOnAppLeave]);

  return <>{children}</>;
}
