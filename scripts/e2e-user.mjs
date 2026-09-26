// Creates (or resets) the throwaway account used by the end-to-end tests, locally only.
// Run: `pnpm e2e:user`. It generates a random password, stores E2E_EMAIL and E2E_PASSWORD
// in .env.local (never printed), and adds E2E_EMAIL to the local ALLOWED_EMAILS, after the
// owner's address. Production keeps its own ALLOWED_EMAILS, so this account can't get in there.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

const ENV_FILE = '.env.local';
const DEFAULT_EMAIL = 'e2e@scaffale.test';

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [
          line.slice(0, index).trim(),
          line
            .slice(index + 1)
            .trim()
            .replace(/^"|"$/g, ''),
        ];
      }),
  );
}

/** Replaces KEY=... in place, or appends it. */
function setEnvValue(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
}

let text = readFileSync(ENV_FILE, 'utf8');
const env = parseEnv(text);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const email = (env.E2E_EMAIL || DEFAULT_EMAIL).toLowerCase();

if (!url || !secretKey || !env.ALLOWED_EMAILS) {
  console.error(
    'Servono NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e ALLOWED_EMAILS in .env.local.',
  );
  process.exit(1);
}

const password = randomBytes(24).toString('base64url');
const admin = createClient(url, secretKey, { auth: { persistSession: false } });

// Reuse the account if it exists (listUsers is paginated; a personal project has few users).
const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error('Impossibile leggere gli utenti:', listError.message);
  process.exit(1);
}
const existing = listed.users.find((user) => user.email?.toLowerCase() === email);

const { error } = existing
  ? await admin.auth.admin.updateUserById(existing.id, { password })
  : await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Test' },
    });
if (error) {
  console.error('Impossibile creare l’account di prova:', error.message);
  process.exit(1);
}

const allowed = env.ALLOWED_EMAILS.split(',').map((address) => address.trim().toLowerCase());
if (!allowed.includes(email)) allowed.push(email);

text = setEnvValue(text, 'ALLOWED_EMAILS', allowed.join(','));
text = setEnvValue(text, 'E2E_EMAIL', email);
text = setEnvValue(text, 'E2E_PASSWORD', password);
writeFileSync(ENV_FILE, text);

console.log(
  `Account di prova ${existing ? 'aggiornato' : 'creato'}: ${email}. Password salvata in ${ENV_FILE}.`,
);
