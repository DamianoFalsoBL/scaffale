import { describe, expect, it } from 'vitest';

import { publicEnvSchema, serverEnvSchema } from './env';

describe('publicEnvSchema', () => {
  it('accepts a complete configuration', () => {
    const env = publicEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
      NEXT_PUBLIC_SITE_URL: 'https://media.example.com',
    });

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://media.example.com');
  });

  it('treats empty strings as unset and applies the site URL default', () => {
    const env = publicEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      NEXT_PUBLIC_SITE_URL: '',
    });

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('rejects a malformed Supabase URL', () => {
    const result = publicEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_URL: 'not a url' });

    expect(result.success).toBe(false);
  });
});

describe('serverEnvSchema', () => {
  it('normalizes ALLOWED_EMAILS into a lowercase list', () => {
    const env = serverEnvSchema.parse({ ALLOWED_EMAILS: ' Me@Example.com, other@example.com ,' });

    expect(env.ALLOWED_EMAILS).toEqual(['me@example.com', 'other@example.com']);
  });

  it('defaults ALLOWED_EMAILS to an empty list', () => {
    expect(serverEnvSchema.parse({}).ALLOWED_EMAILS).toEqual([]);
  });

  it('rejects invalid emails and short cron secrets', () => {
    expect(serverEnvSchema.safeParse({ ALLOWED_EMAILS: 'not-an-email' }).success).toBe(false);
    expect(serverEnvSchema.safeParse({ CRON_SECRET: 'short' }).success).toBe(false);
  });
});
