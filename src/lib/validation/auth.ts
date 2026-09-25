import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Inserisci un indirizzo email valido.' })),
});

// Link types accepted by supabase.auth.verifyOtp for email links.
export const emailOtpTypeSchema = z.enum([
  'email',
  'magiclink',
  'signup',
  'invite',
  'recovery',
  'email_change',
]);
