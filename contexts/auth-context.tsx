import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  AuthError,
  Session,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

WebBrowser.maybeCompleteAuthSession();
const LOGIN_AT_KEY = 'auth_login_at';
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function getStoredLoginAt(): number | null {
  try {
    const raw = globalThis.localStorage?.getItem(LOGIN_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setStoredLoginAt(ms: number): void {
  try {
    globalThis.localStorage?.setItem(LOGIN_AT_KEY, String(ms));
  } catch {
    // ignore storage write errors
  }
}

function clearStoredLoginAt(): void {
  try {
    globalThis.localStorage?.removeItem(LOGIN_AT_KEY);
  } catch {
    // ignore storage remove errors
  }
}

type AuthResult = { error: AuthError | null };

type AuthContextValue = {
  isConfigured: boolean;
  session: Session | null;
  loading: boolean;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<AuthResult>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const checkAndRefreshRollingExpiry = async (): Promise<boolean> => {
      if (!supabase) return false;
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session ?? null;
      if (!currentSession) {
        clearStoredLoginAt();
        setSession(null);
        return false;
      }

      const loginAt = getStoredLoginAt();
      if (loginAt && Date.now() - loginAt > ONE_MONTH_MS) {
        await supabase.auth.signOut();
        clearStoredLoginAt();
        setSession(null);
        return false;
      }

      // Sliding expiration: valid access resets the 30-day window.
      setStoredLoginAt(Date.now());
      setSession(currentSession);
      return true;
    };

    checkAndRefreshRollingExpiry().then(() => {
      if (!mounted) return;
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (nextSession) {
        setStoredLoginAt(Date.now());
      }
      if (event === 'SIGNED_OUT' || !nextSession) {
        clearStoredLoginAt();
      }
      setSession(nextSession);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (!supabase) return;
      if (state === 'active') {
        void checkAndRefreshRollingExpiry();
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const signIn = useCallback(
    async (credentials: SignInWithPasswordCredentials): Promise<AuthResult> => {
      if (!supabase) {
        return { error: null };
      }
      const { error } = await supabase.auth.signInWithPassword(credentials);
      return { error };
    },
    []
  );

  const signUp = useCallback(
    async (credentials: SignUpWithPasswordCredentials): Promise<AuthResult> => {
      if (!supabase) {
        return { error: null };
      }
      const { error } = await supabase.auth.signUp(credentials);
      return { error };
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) {
      return { error: null };
    }

    const redirectTo = makeRedirectUri({
      scheme: 'webibleapp',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error || !data?.url) {
      return { error };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { error: null };
    }

    const codeMatch = result.url.match(/[?&]code=([^&#]+)/);
    const code = codeMatch?.[1];
    if (!code) {
      return { error: null };
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    return { error: exchangeError };
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) {
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    if (!error) {
      clearStoredLoginAt();
    }
    return { error };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      session,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, signIn, signUp, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
