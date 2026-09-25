'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isEmailAllowed } from '@/lib/auth/allowlist';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/auth';

export type LoginState =
  | { status: 'idle' }
  | { status: 'sent'; email: string }
  | { status: 'error'; message: string; email?: string };

export async function signInWithMagicLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Email non valida.',
    };
  }

  const { email } = parsed.data;

  // Same answer for allowed and unknown emails, so the form cannot be used to probe accounts.
  if (!isEmailAllowed(email, serverEnv.ALLOWED_EMAILS)) {
    return { status: 'sent', email };
  }

  const origin = (await headers()).get('origin') ?? publicEnv.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      // Only explicitly allowlisted emails may create an account (and only while Supabase allows sign-ups).
      shouldCreateUser: serverEnv.ALLOWED_EMAILS.length > 0,
    },
  });

  if (error) {
    console.error('signInWithOtp failed', { status: error.status, code: error.code });

    if (error.status === 429) {
      return { status: 'error', message: 'Troppi tentativi. Riprova tra qualche minuto.', email };
    }

    // Unknown users with sign-ups disabled land here: keep the neutral answer.
    if (error.code === 'otp_disabled' || error.code === 'signup_disabled') {
      return { status: 'sent', email };
    }

    return {
      status: 'error',
      message: 'Non è stato possibile inviare il link. Riprova più tardi.',
      email,
    };
  }

  return { status: 'sent', email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
