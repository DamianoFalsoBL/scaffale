import { z } from 'zod';

/** Minimum length enforced when setting the password (scripts/set-password.mjs). */
export const MIN_PASSWORD_LENGTH = 12;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Inserisci un indirizzo email valido.' })),
  password: z
    .string({ error: 'Inserisci la password.' })
    .min(1, { error: 'Inserisci la password.' })
    .max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
