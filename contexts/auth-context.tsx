import type { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { useAppSettings } from '@/contexts/app-settings';
import { setActiveUserId } from '@/lib/auth-state';
import { syncUserProfileFromAuthUser } from '@/lib/church';
import {
  bootstrapSupabaseUserData,
  getLocalDataOwnerUserId,
  resetLocalPersistedState,
} from '@/lib/sqlite-supabase-store';
import { createSupabaseClient } from '@/lib/supabase-client';
import { pauseSQLiteStateSync, resumeSQLiteStateSync } from '@/lib/sqlite-sync-control';
import { getUserProvider, isSupabaseConfigured, type SocialProvider } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  currentUser: User | null;
  dataUserId: string | null;
  isConfigured: boolean;
  isLoadingSession: boolean;
  isSyncingData: boolean;
  lastError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: SocialProvider) => Promise<void>;
  clearLastError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'AUTH_OPERATION_FAILED';
}

function parseAuthResultUrl(url: string) {
  const parsed = new URL(url);
  const searchParams = new URLSearchParams(parsed.search);
  const hashParams = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash);

  return {
    code: searchParams.get('code'),
    accessToken: hashParams.get('access_token') ?? searchParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token') ?? searchParams.get('refresh_token'),
    errorDescription:
      hashParams.get('error_description') ??
      searchParams.get('error_description') ??
      hashParams.get('error') ??
      searchParams.get('error'),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { refreshSettings } = useAppSettings();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const configured = isSupabaseConfigured();

  const resetToGuest = useCallback(async () => {
    setCurrentUser(null);
    setDataUserId(null);
    setActiveUserId(null);

    const localDataOwnerUserId = await getLocalDataOwnerUserId(db);
    if (localDataOwnerUserId) {
      pauseSQLiteStateSync();
      try {
        await resetLocalPersistedState(db);
      } finally {
        resumeSQLiteStateSync();
      }
    }

    await refreshSettings();
  }, [db, refreshSettings]);

  const syncAuthenticatedUser = useCallback(
    async (user: User) => {
      setCurrentUser(user);
      setIsSyncingData(true);

      pauseSQLiteStateSync();
      try {
        await bootstrapSupabaseUserData(db, user.id);
        await syncUserProfileFromAuthUser(user);
        setActiveUserId(user.id);
        await refreshSettings();
        if (!mountedRef.current) return;
        setDataUserId(user.id);
        setLastError(null);
      } catch (error) {
        if (!mountedRef.current) return;
        const message = getErrorMessage(error);
        setLastError(message);
        setCurrentUser(null);
        setDataUserId(null);
        setActiveUserId(null);

        const supabase = createSupabaseClient();
        const result = await supabase.auth.signOut();
        if (result.error) {
          console.warn('Failed to sign out after SQLite sync bootstrap error.', result.error);
        }
      } finally {
        resumeSQLiteStateSync();
        if (!mountedRef.current) return;
        setIsSyncingData(false);
        setIsLoadingSession(false);
      }
    },
    [db, refreshSettings],
  );

  const enqueueUserSync = useCallback(
    (user: User | null) => {
      syncQueueRef.current = syncQueueRef.current
        .catch(() => {
          // Keep the sync queue usable after a previous failure.
        })
        .then(async () => {
          if (!mountedRef.current) return;

          if (!user) {
            await resetToGuest();
            if (!mountedRef.current) return;
            setIsSyncingData(false);
            setIsLoadingSession(false);
            return;
          }

          await syncAuthenticatedUser(user);
        });

      return syncQueueRef.current;
    },
    [resetToGuest, syncAuthenticatedUser],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!configured) {
      setCurrentUser(null);
      setDataUserId(null);
      setActiveUserId(null);
      setIsLoadingSession(false);
      setIsSyncingData(false);
      return;
    }

    const supabase = createSupabaseClient();

    const loadSession = async () => {
      setIsLoadingSession(true);
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setLastError(getErrorMessage(error));
      }
      await enqueueUserSync(error ? null : data.user ?? null);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void enqueueUserSync(session?.user ?? null);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [configured, enqueueUserSync, resetToGuest]);

  useEffect(() => {
    if (!configured || Platform.OS === 'web') return;

    const supabase = createSupabaseClient();
    void supabase.auth.startAutoRefresh();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createSupabaseClient();
    setLastError(null);
    setIsLoadingSession(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setIsLoadingSession(false);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createSupabaseClient();
    setLastError(null);
    setIsLoadingSession(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setIsLoadingSession(false);
      throw error;
    }
    if (!data.session?.user) {
      setIsLoadingSession(false);
    }
    return {
      requiresEmailVerification: !data.session?.user,
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    setLastError(null);
    setIsLoadingSession(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsLoadingSession(false);
      throw error;
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: SocialProvider) => {
    const supabase = createSupabaseClient();
    setLastError(null);
    setIsLoadingSession(true);

    if (Platform.OS === 'web') {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        setIsLoadingSession(false);
        throw error;
      }

      return;
    }

    const redirectTo = Linking.createURL('/auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      setIsLoadingSession(false);
      throw error ?? new Error('OAUTH_URL_MISSING');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      setIsLoadingSession(false);
      throw new Error('OAUTH_CANCELLED');
    }

    const { code, accessToken, refreshToken, errorDescription } = parseAuthResultUrl(result.url);
    if (errorDescription) {
      setIsLoadingSession(false);
      throw new Error(errorDescription);
    }

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setIsLoadingSession(false);
        throw exchangeError;
      }
      return;
    }

    if (!accessToken || !refreshToken) {
      setIsLoadingSession(false);
      throw new Error('OAUTH_SESSION_MISSING');
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      setIsLoadingSession(false);
      throw sessionError;
    }
  }, []);

  const clearLastError = useCallback(() => {
    setLastError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      dataUserId,
      isConfigured: configured,
      isLoadingSession,
      isSyncingData,
      lastError,
      signIn,
      signUp,
      signOut,
      signInWithOAuth,
      clearLastError,
    }),
    [
      clearLastError,
      configured,
      currentUser,
      dataUserId,
      isLoadingSession,
      isSyncingData,
      lastError,
      signIn,
      signInWithOAuth,
      signOut,
      signUp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useAuthProviderName() {
  return getUserProvider(useAuth().currentUser);
}
