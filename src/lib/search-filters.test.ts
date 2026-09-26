import { describe, expect, it } from 'vitest';

import { genresFor } from '@/lib/catalogs';
import type { NormalizedMedia } from '@/lib/providers/types';

import {
  countActiveFilters,
  discoverParams,
  filtersForType,
  filtersToEntries,
  matchesFilters,
  searchFiltersSchema,
  yearRangeLabel,
} from './search-filters';

const today = '2026-09-26';

describe('searchFiltersSchema', () => {
  it('parses URL values and drops invalid ones', () => {
    expect(
      searchFiltersSchema.parse({
        genre: 'horror',
        from: '2020',
        to: 'x',
        rating: '7',
        provider: 'netflix',
        sort: 'rating',
      }),
    ).toEqual({
      genre: 'horror',
      from: 2020,
      to: undefined,
      rating: 7,
      provider: 'netflix',
      sort: 'rating',
    });

    expect(searchFiltersSchema.parse({ genre: 'polka', provider: 'mubi', from: '' })).toEqual({
      genre: undefined,
      from: undefined,
      to: undefined,
      rating: undefined,
      provider: undefined,
      sort: 'popular',
    });
  });

  it('serializes only non-default values and counts active filters', () => {
    const filters = searchFiltersSchema.parse({ genre: 'commedia', from: '2000', to: '2009' });

    expect(filtersToEntries(filters)).toEqual([
      ['genre', 'commedia'],
      ['from', '2000'],
      ['to', '2009'],
    ]);
    expect(countActiveFilters(filters)).toBe(2);
    expect(countActiveFilters(searchFiltersSchema.parse({ sort: 'newest' }))).toBe(0);
  });

  it('labels year ranges in Italian', () => {
    expect(yearRangeLabel({ from: 2020 })).toBe('dal 2020');
    expect(yearRangeLabel({ to: 1999 })).toBe('fino al 1999');
    expect(yearRangeLabel({ from: 2021, to: 2021 })).toBe('2021');
    expect(yearRangeLabel({ from: 2010, to: 2019 })).toBe('2010–2019');
    expect(yearRangeLabel({})).toBeUndefined();
  });
});

describe('filtersForType', () => {
  it('keeps what applies and drops the rest', () => {
    const filters = searchFiltersSchema.parse({
      genre: 'horror',
      from: '2000',
      rating: '7',
      provider: 'netflix',
    });

    expect(filtersForType(filters, 'movie')).toEqual(filters);
    expect(filtersForType(filters, 'tv')).toMatchObject({ genre: undefined, rating: 7 });
    expect(filtersForType(filters, 'book')).toEqual({
      ...filters,
      rating: undefined,
      provider: undefined,
    });
  });
});

describe('discoverParams', () => {
  const parse = (value: Record<string, string>) => searchFiltersSchema.parse(value);

  it('builds a movie query: genre, year range, rating, platform in Italy', () => {
    expect(
      discoverParams(
        'movie',
        parse({ genre: 'commedia', from: '2010', to: '2019', rating: '7', provider: 'netflix' }),
        2,
        today,
      ),
    ).toEqual({
      page: '2',
      include_adult: 'false',
      sort_by: 'popularity.desc',
      'vote_count.gte': '100',
      with_genres: '35',
      'primary_release_date.gte': '2010-01-01',
      'primary_release_date.lte': '2019-12-31',
      'vote_average.gte': '7',
      with_watch_providers: '8',
      watch_region: 'IT',
      with_watch_monetization_types: 'flatrate|free|ads',
    });
  });

  it('uses first air dates for series and never returns unreleased titles as newest', () => {
    expect(discoverParams('tv', parse({ sort: 'newest', from: '2020' }), 1, today)).toMatchObject({
      sort_by: 'first_air_date.desc',
      'first_air_date.gte': '2020-01-01',
      'first_air_date.lte': today,
      'vote_count.gte': '10',
    });
  });

  it('keeps talk shows, news and soaps out of series, with a higher floor for popular ones', () => {
    expect(discoverParams('tv', parse({}), 1, today)).toMatchObject({
      without_genres: '10763,10766,10767',
      'vote_count.gte': '50',
    });
    expect(discoverParams('movie', parse({}), 1, today)).not.toHaveProperty('without_genres');
    expect(discoverParams('movie', parse({}), 1, today)?.['vote_count.gte']).toBe('10');
    expect(discoverParams('movie', parse({ sort: 'rating' }), 1, today)?.['vote_count.gte']).toBe(
      '300',
    );
  });

  it('skips a type where the genre does not exist', () => {
    expect(discoverParams('tv', parse({ genre: 'horror' }), 1, today)).toBeNull();
    expect(discoverParams('tv', parse({ genre: 'fantascienza' }), 1, today)?.with_genres).toBe(
      '10765',
    );
  });
});

describe('matchesFilters', () => {
  const movie: NormalizedMedia = {
    source: 'tmdb',
    externalId: '1',
    mediaType: 'movie',
    title: 'A',
    year: 2015,
    genreIds: [35, 18],
    rating: { average: 7.4, count: 900 },
    extra: {},
  };
  const book: NormalizedMedia = {
    source: 'google_books',
    externalId: 'b',
    mediaType: 'book',
    title: 'B',
    year: 1990,
    extra: {},
  };
  const f = (value: Record<string, string>) => searchFiltersSchema.parse(value);

  it('checks year range, genre and minimum rating', () => {
    expect(matchesFilters(movie, f({ from: '2010' }))).toBe(true);
    expect(matchesFilters(movie, f({ from: '2016' }))).toBe(false);
    expect(matchesFilters(movie, f({ genre: 'commedia' }))).toBe(true);
    expect(matchesFilters(movie, f({ genre: 'horror' }))).toBe(false);
    expect(matchesFilters(movie, f({ rating: '7' }))).toBe(true);
    expect(matchesFilters(movie, f({ rating: '8' }))).toBe(false);
    // A handful of votes doesn't make an average.
    expect(matchesFilters({ ...movie, rating: { average: 9, count: 3 } }, f({ rating: '7' }))).toBe(
      false,
    );
  });

  it('excludes undated titles when a year is set, and checks only the year for books', () => {
    expect(matchesFilters({ ...movie, year: undefined }, f({ to: '2000' }))).toBe(false);
    expect(matchesFilters(book, f({ to: '2000', genre: 'horror', rating: '8' }))).toBe(true);
    expect(matchesFilters(book, f({ from: '2000' }))).toBe(false);
  });
});

describe('genresFor', () => {
  it('offers only genres that exist for the chosen type', () => {
    const labels = (type: Parameters<typeof genresFor>[0]) => genresFor(type).map((g) => g.slug);

    expect(labels('tv')).not.toContain('horror');
    expect(labels('movie')).toContain('horror');
    expect(labels('book')).toEqual(expect.arrayContaining(['fantascienza', 'biografia']));
    expect(labels('book')).not.toContain('animazione');
    expect(labels('person')).toEqual([]);
  });
});
