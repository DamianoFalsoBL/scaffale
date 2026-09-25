import { describe, expect, it } from 'vitest';

import { searchQuerySchema } from './search';

describe('searchQuerySchema', () => {
  it('parses a full query string', () => {
    expect(searchQuerySchema.parse({ q: ' dune ', type: 'tv', page: '2' })).toEqual({
      q: 'dune',
      type: 'tv',
      page: 2,
    });
  });

  it('defaults invalid type and page instead of failing', () => {
    expect(searchQuerySchema.parse({ q: 'dune', type: 'podcast', page: '999' })).toEqual({
      q: 'dune',
      type: 'all',
      page: 1,
    });
  });

  it('requires at least two characters', () => {
    expect(searchQuerySchema.safeParse({ q: ' d ' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({}).success).toBe(false);
  });
});
