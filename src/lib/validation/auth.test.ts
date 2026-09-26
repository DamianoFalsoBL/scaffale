import { describe, expect, it } from 'vitest';

import { loginSchema } from './auth';

describe('loginSchema', () => {
  it('normalizes the email and keeps the password as typed', () => {
    expect(loginSchema.parse({ email: '  Me@Example.com ', password: ' pa ss ' })).toEqual({
      email: 'me@example.com',
      password: ' pa ss ',
    });
  });

  it('rejects invalid emails with an Italian message', () => {
    const result = loginSchema.safeParse({ email: 'nope', password: 'x' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Inserisci un indirizzo email valido.');
  });

  it('requires a password', () => {
    for (const password of ['', undefined]) {
      const result = loginSchema.safeParse({ email: 'me@example.com', password });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Inserisci la password.');
    }
  });
});
