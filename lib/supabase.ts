import type { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null;
const appleAuthServiceId = process.env.EXPO_PUBLIC_APPLE_AUTH_SERVICE_ID?.trim() || null;
const appleAuthRedirectUri = process.env.EXPO_PUBLIC_APPLE_AUTH_REDIRECT_URI?.trim() || null;
const nativeAuthRedirectUrl = 'webibleapp://auth/callback';

export type SocialProvider = 'google' | 'kakao' | 'apple';

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function requireSupabaseConfig() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function getNativeAuthRedirectUrl() {
  return nativeAuthRedirectUrl;
}

export function getAppleAuthRedirectUrl() {
  return appleAuthRedirectUri;
}

export function isAppleOAuthConfigured() {
  return Boolean(appleAuthServiceId && appleAuthRedirectUri);
}

export function getUserProvider(user: User | null) {
  const provider = user?.app_metadata?.provider;
  return typeof provider === 'string' ? provider : null;
}

export function getUserDisplayName(user: User | null) {
  if (!user) return null;

  const metadata = user.user_metadata;
  const candidates = [
    metadata?.full_name,
    metadata?.name,
    metadata?.nickname,
    metadata?.preferred_username,
  ];

  const displayName = candidates.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  return displayName?.trim() ?? null;
}

export function getUserAccountLabel(user: User | null) {
  if (!user) return null;
  return user.email ?? getUserDisplayName(user) ?? null;
}
