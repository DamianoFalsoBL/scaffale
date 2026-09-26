'use server';

import { redirect } from 'next/navigation';

import { isEmailAllowed } from '@/lib/auth/allowlist';
import { serverEnv } from '@/lib/env.server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/auth';

export type LoginState = { status: 'idle' } | { status: 'error'; message: string; email?: string };

// One message for unknown emails and wrong passwords, so the form can't be used to probe accounts.
const INVALID_CREDENTIALS = 'Email o password non corretti.';

export async function signInWithPassword(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS,
      email: typeof formData.get('email') === 'string' ? String(formData.get('email')) : undefined,
    };
  }

  const { email, password } = parsed.data;

  if (!isEmailAllowed(email, serverEnv.ALLOWED_EMAILS)) {
    return { status: 'error', message: INVALID_CREDENTIALS, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.warn('signInWithPassword failed', { status: error.status, code: error.code });
    const message =
      error.status === 429
        ? 'Troppi tentativi. Riprova tra qualche minuto.'
        : error.code === 'invalid_credentials'
          ? INVALID_CREDENTIALS
          : 'Non è stato possibile accedere. Riprova tra poco.';
    return { status: 'error', message, email };
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
