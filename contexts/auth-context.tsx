import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  AuthError,
  Session,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

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

function toAuthError(message: string): AuthError {
  return {
    name: 'AuthError',
    message,
    status: 400,
  } as AuthError;
}

function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const [baseAndQuery, fragment = ''] = url.split('#');
  const query = baseAndQuery.split('?')[1] ?? '';
  const combined = [query, fragment].filter(Boolean).join('&');
  combined.split('&').forEach((pair) => {
    if (!pair) return;
    const [rawKey, rawValue = ''] = pair.split('=');
    if (!rawKey) return;
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawValue);
    params[key] = value;
  });
  return params;
}

type AuthResult = { error: AuthError | null };

type AuthContextValue = {
  isConfigured: boolean;
  session: Session | null;
  loading: boolean;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<AuthResult>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithKakao: () => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  updateDisplayName: (displayName: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
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
      preferLocalhost: true,
      // path: 'auth/callback',
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
      return { error: error ?? toAuthError('Failed to create Google OAuth URL.') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { error: toAuthError(`Google login was not completed (${result.type}).`) };
    }

    const callbackParams = parseUrlParams(result.url);
    const oauthError = callbackParams.error_description ?? callbackParams.error;
    if (oauthError) {
      return { error: toAuthError(oauthError) };
    }

    const code = callbackParams.code;
    if (code) {
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        code
      );
      if (!exchangeError && exchangeData.session) {
        setSession(exchangeData.session);
        setStoredLoginAt(Date.now());
      }
      return { error: exchangeError };
    }

    const accessToken = callbackParams.access_token;
    const refreshToken = callbackParams.refresh_token;
    if (accessToken && refreshToken) {
      const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!setSessionError && sessionData.session) {
        setSession(sessionData.session);
        setStoredLoginAt(Date.now());
      }
      return { error: setSessionError };
    }

    return {
      error: toAuthError(
        'No authorization code or token found in Google callback URL.'
      ),
    };
  }, []);

  const signInWithKakao = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) {
      return { error: null };
    }

    const redirectTo = makeRedirectUri({
      scheme: 'webibleapp',
      preferLocalhost: true,
      // path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      return { error: error ?? toAuthError('Failed to create Kakao OAuth URL.') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { error: toAuthError(`Kakao login was not completed (${result.type}).`) };
    }

    const callbackParams = parseUrlParams(result.url);
    const oauthError = callbackParams.error_description ?? callbackParams.error;
    if (oauthError) {
      return { error: toAuthError(oauthError) };
    }

    const code = callbackParams.code;
    if (code) {
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        code
      );
      if (!exchangeError && exchangeData.session) {
        setSession(exchangeData.session);
        setStoredLoginAt(Date.now());
      }
      return { error: exchangeError };
    }

    const accessToken = callbackParams.access_token;
    const refreshToken = callbackParams.refresh_token;
    if (accessToken && refreshToken) {
      const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!setSessionError && sessionData.session) {
        setSession(sessionData.session);
        setStoredLoginAt(Date.now());
      }
      return { error: setSessionError };
    }

    return {
      error: toAuthError(
        'No authorization code or token found in Kakao callback URL.'
      ),
    };
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

  const updateDisplayName = useCallback(async (displayName: string): Promise<AuthResult> => {
    if (!supabase) {
      return { error: null };
    }
    const normalized = displayName.trim();
    const { data, error } = await supabase.auth.updateUser({
      data: { name: normalized },
    });
    if (!error && data.user) {
      setSession((prev) => (prev ? { ...prev, user: data.user } : prev));
    }
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) {
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
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
      signInWithKakao,
      signOut,
      updateDisplayName,
      updatePassword,
    }),
    [
      session,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithKakao,
      signOut,
      updateDisplayName,
      updatePassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
