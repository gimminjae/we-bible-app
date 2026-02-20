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
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (!supabase) return;
      if (state === 'active') {
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
