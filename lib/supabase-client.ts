import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { authStorage } from '@/lib/auth-storage';
import { requireSupabaseConfig } from '@/lib/supabase';

let supabaseClient: SupabaseClient | null = null;

export function createSupabaseClient() {
  if (!supabaseClient) {
    const { supabaseUrl, supabasePublishableKey } = requireSupabaseConfig();
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  }

  return supabaseClient;
}
