import { describe, expect, it, vi } from 'vitest';

import genresMovie from '../../../tests/fixtures/tmdb/genres-movie.json';
import genresTv from '../../../tests/fixtures/tmdb/genres-tv.json';
import movieRich from '../../../tests/fixtures/tmdb/movie-rich.json';
import person from '../../../tests/fixtures/tmdb/person.json';
import searchPerson from '../../../tests/fixtures/tmdb/search-person.json';
import tvRich from '../../../tests/fixtures/tmdb/tv-rich.json';
import type { FetchLike } from './http';
import {
  createTmdbProvider,
  departmentLabel,
  mapPerson,
  mapTitleExtras,
  mapTmdbMovieDetails,
  mapTmdbTvDetails,
  mapWatchProviders,
  tmdbMovieDetailsSchema,
  tmdbPersonSchema,
  tmdbRichSchema,
  tmdbTvDetailsSchema,
} from './tmdb';

const genres = new Map(
  [...genresMovie.genres, ...genresTv.genres].map((genre) => [genre.id, genre.name]),
);

describe('catalog snapshot names', () => {
  it('keeps directors and main cast for movies', () => {
    const media = mapTmdbMovieDetails(tmdbMovieDetailsSchema.parse(movieRich));

    expect(media.extra.directors).toEqual(['Denis Villeneuve']);
    expect(media.extra.cast).toHaveLength(5);
    expect(media.extra.cast).toContain('Timothée Chalamet');
  });

  it('uses creators and aggregate cast for series', () => {
    const media = mapTmdbTvDetails(tmdbTvDetailsSchema.parse(tvRich));

    expect(media.extra.directors).toEqual(['Diane Ademu-John', 'Alison Schapker']);
    expect(media.extra.cast).toContain('Emily Watson');
  });

  it('works without credits', () => {
    const media = mapTmdbMovieDetails(
      tmdbMovieDetailsSchema.parse({ ...movieRich, credits: undefined }),
    );

    expect(media.extra).toMatchObject({ directors: [], cast: [] });
  });
});

describe('mapTitleExtras', () => {
  it('maps a movie: director, cast with roles and photos, recommendations', () => {
    const extras = mapTitleExtras(tmdbRichSchema.parse(movieRich), 'movie', genres);

    expect(extras.directors).toEqual([
      expect.objectContaining({ id: 137427, name: 'Denis Villeneuve', role: 'Regia' }),
    ]);
    expect(extras.cast[0]).toMatchObject({
      name: 'Timothée Chalamet',
      role: 'Paul Atreides',
      profileUrl: expect.stringMatching(/^https:\/\/image\.tmdb\.org\/t\/p\/w185\//),
    });
    expect(extras.recommendations[0]).toMatchObject({
      externalId: '693134',
      mediaType: 'movie',
      title: 'Dune - Parte due',
    });
  });

  it('maps a series: creators and characters from aggregate credits', () => {
    const extras = mapTitleExtras(tmdbRichSchema.parse(tvRich), 'tv', genres);

    expect(extras.directors.map((p) => p.role)).toEqual(['Ideazione', 'Ideazione']);
    expect(extras.cast[0]).toMatchObject({ name: 'Emily Watson' });
    expect(extras.cast[0]?.role).toMatch(/Valya/);
    expect(extras.recommendations.every((m) => m.mediaType === 'tv')).toBe(true);
  });
});

describe('mapWatchProviders', () => {
  it('groups Italian availability by type, sorted by priority, with logos', () => {
    const providers = mapWatchProviders(tmdbRichSchema.parse(movieRich)['watch/providers']);

    expect(providers?.link).toContain('locale=IT');
    expect(providers?.rent.length).toBeGreaterThan(0);
    expect(providers?.rent[0]).toMatchObject({
      name: 'Apple TV Store',
      logoUrl: expect.stringContaining('/w92/'),
    });
  });

  it('returns null when a title is not available in Italy', () => {
    expect(mapWatchProviders({ results: { US: { flatrate: [] } } })).toBeNull();
    expect(mapWatchProviders(undefined)).toBeNull();
  });
});

describe('mapPerson', () => {
  const details = mapPerson(tmdbPersonSchema.parse(person), genres);

  it('falls back to the English biography', () => {
    expect(person.biography).toBe('');
    expect(details.biography).toBe(person.translations.translations[0]?.data.biography);
  });

  it('lists directing credits newest first', () => {
    expect(details.department).toBe('Regia');
    expect(details.directing.length).toBeGreaterThan(3);
    expect(details.directing.every((credit) => credit.role === 'Regia')).toBe(true);
    const years = details.directing.map((credit) => credit.year ?? 0);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('drops archive footage and self appearances', () => {
    const cast = [
      { media_type: 'movie', id: 1, title: 'Film vero', character: 'Paul' },
      { media_type: 'movie', id: 2, title: 'Speciale', character: '(archive footage)' },
      { media_type: 'tv', id: 3, name: 'Talk show', character: 'Himself - Guest' },
    ];
    const result = mapPerson(
      tmdbPersonSchema.parse({ ...person, combined_credits: { cast, crew: [] } }),
      genres,
    );

    expect(result.acting.map((credit) => credit.title)).toEqual(['Film vero']);
  });

  it('drops self appearances from acting credits', () => {
    const selfRoles = details.acting.filter((credit) => /self|himself/i.test(credit.role ?? ''));
    expect(selfRoles).toEqual([]);
  });
});

describe('people search', () => {
  it('returns people with Italian department labels', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => new Response(JSON.stringify(searchPerson)));
    const provider = createTmdbProvider({ accessToken: 'token', fetchImpl });

    const result = await provider.searchPeople('villeneuve');

    expect(new URL(fetchImpl.mock.calls[0]![0]).pathname).toBe('/3/search/person');
    expect(result.people[0]).toMatchObject({
      id: 137427,
      name: 'Denis Villeneuve',
      department: 'Regia',
    });
    expect(result.people[0]?.knownFor.length).toBeGreaterThan(0);
  });

  it('labels departments in Italian and keeps unknown ones', () => {
    expect(departmentLabel('Acting')).toBe('Recitazione');
    expect(departmentLabel('Lighting')).toBe('Lighting');
    expect(departmentLabel('')).toBeUndefined();
  });
});
