import { createClient } from '@supabase/supabase-js';

/**
 * The throwaway account created by `pnpm e2e:user`. Refuses to run against the owner's
 * address (the first of ALLOWED_EMAILS), so a wrong .env.local can never wipe real data.
 */
export function testAccount() {
  const email = process.env.E2E_EMAIL?.trim().toLowerCase();
  const password = process.env.E2E_PASSWORD;
  const owner = process.env.ALLOWED_EMAILS?.split(',')[0]?.trim().toLowerCase();

  if (!email || !password) {
    throw new Error('E2E_EMAIL and E2E_PASSWORD are missing: run `pnpm e2e:user` first.');
  }
  if (email === owner) {
    throw new Error('E2E_EMAIL is the owner account: the tests only run on a test account.');
  }
  return { email, password };
}

/** Deletes the test account's library and lists (seasons and list items cascade). */
export async function resetTestAccount() {
  const { email } = testAccount();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error('Supabase URL and secret key are needed.');

  const admin = createClient(url, secretKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!user) throw new Error(`Test account ${email} not found: run \`pnpm e2e:user\`.`);

  for (const table of ['lists', 'user_entries'] as const) {
    const { error: deleteError } = await admin.from(table).delete().eq('user_id', user.id);
    if (deleteError) throw deleteError;
  }
}
