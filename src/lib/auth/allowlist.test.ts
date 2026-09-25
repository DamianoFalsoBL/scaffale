import { describe, expect, it } from 'vitest';

import { isEmailAllowed } from './allowlist';

describe('isEmailAllowed', () => {
  const allowlist = ['me@example.com'];

  it('allows everyone when the allowlist is empty', () => {
    expect(isEmailAllowed('anyone@example.com', [])).toBe(true);
  });

  it('allows listed emails regardless of case and whitespace', () => {
    expect(isEmailAllowed(' Me@Example.COM ', allowlist)).toBe(true);
  });

  it('rejects unlisted or missing emails', () => {
    expect(isEmailAllowed('other@example.com', allowlist)).toBe(false);
    expect(isEmailAllowed(undefined, allowlist)).toBe(false);
    expect(isEmailAllowed('', allowlist)).toBe(false);
  });
});
