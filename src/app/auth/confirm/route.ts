import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { emailOtpTypeSchema } from '@/lib/validation/auth';

/**
 * Magic link landing route. Supports both link styles:
 * - `code` (default Supabase template, PKCE): works only in the browser that asked for the link.
 *   This is what we get today: free-tier projects on the built-in SMTP cannot edit templates.
 * - `token_hash` + `type` (custom template, needs custom SMTP): works on any device.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = emailOtpTypeSchema.safeParse(searchParams.get('type'));
  const code = searchParams.get('code');

  const supabase = await createClient();
  let failed = true;

  if (tokenHash && type.success) {
    const { error } = await supabase.auth.verifyOtp({ type: type.data, token_hash: tokenHash });
    failed = !!error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
  }

  redirect(failed ? '/login?error=link_invalid' : '/dashboard');
}
