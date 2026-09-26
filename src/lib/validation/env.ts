import { z } from 'zod';

// Empty values copied from .env.example must behave like unset variables.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.url().default('http://localhost:3000')),
});

// Server variables stay optional until the phase that needs them makes them required.
export const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: optional(z.string().min(1)),
  TMDB_READ_ACCESS_TOKEN: optional(z.string().min(1)),
  GOOGLE_BOOKS_API_KEY: optional(z.string().min(1)),
  CRON_SECRET: optional(z.string().min(16)),
  ALLOWED_EMAILS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.email())),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Online (on Vercel) the app fails closed: without an allowlist anyone with a Supabase
 * account could sign in, and without these secrets cron and catalog writes break.
 */
export function assertDeployedServerEnv(env: ServerEnv) {
  const missing = [
    env.ALLOWED_EMAILS.length === 0 && 'ALLOWED_EMAILS',
    !env.SUPABASE_SECRET_KEY && 'SUPABASE_SECRET_KEY',
    !env.CRON_SECRET && 'CRON_SECRET',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return env;
}
