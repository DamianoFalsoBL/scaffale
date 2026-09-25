import { describe, expect, it } from 'vitest';

import { emailOtpTypeSchema, loginSchema } from './auth';

describe('loginSchema', () => {
  it('normalizes the email', () => {
    expect(loginSchema.parse({ email: '  Me@Example.com ' }).email).toBe('me@example.com');
  });

  it('rejects invalid emails with an Italian message', () => {
    const result = loginSchema.safeParse({ email: 'nope' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Inserisci un indirizzo email valido.');
  });
});

describe('emailOtpTypeSchema', () => {
  it('accepts email link types and rejects others', () => {
    expect(emailOtpTypeSchema.safeParse('email').success).toBe(true);
    expect(emailOtpTypeSchema.safeParse('sms').success).toBe(false);
  });
});
