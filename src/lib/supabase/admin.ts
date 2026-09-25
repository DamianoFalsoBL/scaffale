import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Bypasses RLS. Use only for writes the user cannot do directly,
 * such as upserting shared rows in `media_items`.
 */
export function createAdminClient() {
  if (!serverEnv.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_SECRET_KEY is not set');
  }

  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
