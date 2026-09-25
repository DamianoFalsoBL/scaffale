import 'server-only';

import { cache } from 'react';

import { isEmailAllowed } from '@/lib/auth/allowlist';
import { serverEnv } from '@/lib/env.server';
import { createClient } from '@/lib/supabase/server';

export type CurrentUser = {
  id: string;
  email: string;
};

/**
 * The signed-in user, or null when there is no valid session or the email
 * is not in ALLOWED_EMAILS. Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  const { sub, email } = data.claims;

  if (!email || !isEmailAllowed(email, serverEnv.ALLOWED_EMAILS)) {
    return null;
  }

  return { id: sub, email };
});
