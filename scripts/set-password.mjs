// Sets (or changes) the password of the app owner's Supabase account.
// Run it yourself in a terminal: `pnpm auth:set-password`. The password is typed without
// echo, never printed or written to disk, and Supabase stores only its hash.
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

import { createClient } from '@supabase/supabase-js';

const MIN_PASSWORD_LENGTH = 12; // keep in sync with src/lib/validation/auth.ts

function loadEnv(path = '.env.local') {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [
          line.slice(0, index),
          line
            .slice(index + 1)
            .trim()
            .replace(/^"|"$/g, ''),
        ];
      }),
  );
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (text) => {
      if (!muted) write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const email = (env.ALLOWED_EMAILS ?? '').split(',')[0]?.trim().toLowerCase();

if (!url || !secretKey || !email) {
  console.error(
    'Servono NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e ALLOWED_EMAILS in .env.local.',
  );
  process.exit(1);
}

console.log(`Imposto la password per ${email}.`);
const password = await askHidden(`Nuova password (almeno ${MIN_PASSWORD_LENGTH} caratteri): `);

if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(
    `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri. Nessuna modifica.`,
  );
  process.exit(1);
}
if ((await askHidden('Ripeti la password: ')) !== password) {
  console.error('Le due password non coincidono. Nessuna modifica.');
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) {
  console.error('Non riesco a leggere gli utenti:', listError.message);
  process.exit(1);
}

const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
if (!user) {
  console.error(`Nessun account Supabase con email ${email}.`);
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});
if (error) {
  console.error('Aggiornamento non riuscito:', error.message);
  process.exit(1);
}

console.log('Password impostata. Ora puoi accedere con email e password.');
