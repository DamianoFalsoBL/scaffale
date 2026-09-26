import { describe, expect, it } from 'vitest';

import { searchQuerySchema } from './search';

const noFilters = {
  genre: undefined,
  from: undefined,
  to: undefined,
  rating: undefined,
  provider: undefined,
  sort: 'popular',
};

describe('searchQuerySchema', () => {
  it('parses a full query string', () => {
    expect(searchQuerySchema.parse({ q: ' dune ', type: 'tv', page: '2' })).toEqual({
      q: 'dune',
      type: 'tv',
      page: 2,
      ...noFilters,
    });
  });

  it('defaults invalid type and page instead of failing', () => {
    expect(searchQuerySchema.parse({ q: 'dune', type: 'podcast', page: '999' })).toEqual({
      q: 'dune',
      type: 'all',
      page: 1,
      ...noFilters,
    });
  });

  it('parses filters next to the query', () => {
    expect(
      searchQuerySchema.parse({ type: 'movie', genre: 'horror', from: '2020', sort: 'rating' }),
    ).toMatchObject({ q: '', type: 'movie', genre: 'horror', from: 2020, sort: 'rating' });
  });

  it('allows an empty query (Esplora) but not a one-character one', () => {
    expect(searchQuerySchema.safeParse({}).success).toBe(true);
    expect(searchQuerySchema.safeParse({ q: '  ' }).success).toBe(true);
    expect(searchQuerySchema.safeParse({ q: ' d ' }).success).toBe(false);
  });

  it('requires a name to search people', () => {
    expect(searchQuerySchema.safeParse({ type: 'person' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ type: 'person', q: 'nolan' }).success).toBe(true);
  });
});
