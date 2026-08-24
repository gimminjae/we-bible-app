import type {
  AuthChangeEvent,
  Session,
  SignInWithIdTokenCredentials,
  SignOut,
} from '@supabase/supabase-js';

import type { SocialProvider } from '@/lib/supabase';
import { createSupabaseClient } from '@/lib/supabase-client';

export type ParsedAuthResult = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  errorDescription: string | null;
};

export function parseAuthResultUrl(url: string): ParsedAuthResult {
  try {
    const parsed = new URL(url);
    const searchParams = new URLSearchParams(parsed.search);
    const hashParams = new URLSearchParams(
      parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash,
    );

    return {
      code: searchParams.get('code') ?? hashParams.get('code'),
      accessToken:
        hashParams.get('access_token') ?? searchParams.get('access_token'),
      refreshToken:
        hashParams.get('refresh_token') ?? searchParams.get('refresh_token'),
      errorDescription:
        hashParams.get('error_description') ??
        searchParams.get('error_description') ??
        hashParams.get('error') ??
        searchParams.get('error'),
    };
  } catch {
    return {
      code: null,
      accessToken: null,
      refreshToken: null,
      errorDescription: null,
    };
  }
}

export async function getAuthenticatedUser() {
  return await createSupabaseClient().auth.getUser();
}

export function subscribeToAuthStateChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return createSupabaseClient().auth.onAuthStateChange(callback);
}

export async function startAuthAutoRefresh() {
  return await createSupabaseClient().auth.startAutoRefresh();
}

export async function stopAuthAutoRefresh() {
  return await createSupabaseClient().auth.stopAutoRefresh();
}

export async function signInWithPassword(email: string, password: string) {
  return await createSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
}

export async function signUpWithPassword(email: string, password: string) {
  return await createSupabaseClient().auth.signUp({
    email: email.trim(),
    password,
  });
}

export async function signOutAuth(options?: SignOut) {
  return await createSupabaseClient().auth.signOut(options);
}

export async function signInWithProviderIdToken(
  credentials: SignInWithIdTokenCredentials,
) {
  return await createSupabaseClient().auth.signInWithIdToken(credentials);
}

export async function updateAuthUserMetadata(data: Record<string, unknown>) {
  return await createSupabaseClient().auth.updateUser({
    data,
  });
}

export async function signInWithOAuthProvider(
  provider: SocialProvider,
  redirectTo: string,
) {
  return await createSupabaseClient().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });
}

export async function exchangeAuthCodeForSession(code: string) {
  return await createSupabaseClient().auth.exchangeCodeForSession(code);
}

export async function setAuthSession(
  accessToken: string,
  refreshToken: string,
) {
  return await createSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}
