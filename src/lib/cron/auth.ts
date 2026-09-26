import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Compares in constant time;
 * without a configured secret every request is rejected.
 */
export function isAuthorizedCron(authorization: string | null, secret: string | undefined) {
  if (!secret || !authorization) {
    return false;
  }
  // Hashing first makes both buffers the same length, as timingSafeEqual requires.
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}
