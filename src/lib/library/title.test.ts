import { describe, expect, it } from 'vitest';

import { titleHref, titleParamsSchema, toTitleData } from './title';

describe('titleHref', () => {
  it('builds the preview path and encodes the id', () => {
    expect(titleHref({ source: 'tmdb', mediaType: 'movie', externalId: '438631' })).toBe(
      '/title/tmdb/movie/438631',
    );
    expect(titleHref({ source: 'google_books', mediaType: 'book', externalId: 'a b' })).toBe(
      '/title/google_books/book/a%20b',
    );
  });
});

describe('titleParamsSchema', () => {
  it('accepts valid combinations', () => {
    for (const params of [
      { source: 'tmdb', type: 'movie', id: '438631' },
      { source: 'tmdb', type: 'tv', id: '90228' },
      { source: 'google_books', type: 'book', id: 'UXGREQAAQBAJ' },
      { source: 'google_books', type: 'book', id: 'Q0-KzQEACAAJ' },
      { source: 'open_library', type: 'book', id: 'OL8996439W' },
    ]) {
      expect(titleParamsSchema.safeParse(params).success).toBe(true);
    }
  });

  it('rejects mismatched sources, types and ids', () => {
    for (const params of [
      { source: 'tmdb', type: 'book', id: '1' },
      { source: 'google_books', type: 'movie', id: 'abc' },
      { source: 'tmdb', type: 'movie', id: 'abc' },
      { source: 'open_library', type: 'book', id: 'OL1M' },
      { source: 'tmdb', type: 'movie', id: '../configuration' },
      { source: 'imdb', type: 'movie', id: '1' },
    ]) {
      expect(titleParamsSchema.safeParse(params).success).toBe(false);
    }
  });
});

describe('toTitleData', () => {
  it('fills missing optional fields with null', () => {
    expect(
      toTitleData({ source: 'tmdb', externalId: '1', mediaType: 'movie', title: 'A', extra: {} }),
    ).toEqual({
      source: 'tmdb',
      externalId: '1',
      mediaType: 'movie',
      title: 'A',
      originalTitle: null,
      year: null,
      posterUrl: null,
      overview: null,
      genres: [],
      isbn13: null,
      extra: {},
    });
  });
});
