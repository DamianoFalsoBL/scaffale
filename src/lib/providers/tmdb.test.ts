import { describe, expect, it, vi } from 'vitest';

import genresMovie from '../../../tests/fixtures/tmdb/genres-movie.json';
import genresTv from '../../../tests/fixtures/tmdb/genres-tv.json';
import movieDetails from '../../../tests/fixtures/tmdb/movie-details.json';
import searchMovie from '../../../tests/fixtures/tmdb/search-movie.json';
import searchMultiPerson from '../../../tests/fixtures/tmdb/search-multi-person.json';
import searchMulti from '../../../tests/fixtures/tmdb/search-multi.json';
import tvDetails from '../../../tests/fixtures/tmdb/tv-details.json';
import type { FetchLike } from './http';
import {
  createTmdbProvider,
  mapTmdbMovieDetails,
  mapTmdbTvDetails,
  mergeRankings,
  tmdbMovieDetailsSchema,
  type TmdbSearchItem,
  tmdbTvDetailsSchema,
  tmdbPosterUrl,
} from './tmdb';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

/** Routes requests to fixtures by path, like the real API would. */
function fakeTmdb(routes: Record<string, unknown>) {
  return vi.fn<FetchLike>(async (input) => {
    const { pathname } = new URL(input);
    const body = routes[pathname.replace('/3', '')];
    return body ? json(body) : new Response(null, { status: 404 });
  });
}

const genreRoutes = { '/genre/movie/list': genresMovie, '/genre/tv/list': genresTv };

describe('TMDB search', () => {
  it('normalizes multi search results with Italian genre names', async () => {
    const fetchImpl = fakeTmdb({ ...genreRoutes, '/search/multi': searchMulti });
    const provider = createTmdbProvider({ accessToken: 'token', fetchImpl });

    const page = await provider.search('dune');
    const [first] = page.results;

    expect(page.results).toHaveLength(8);
    expect(page.hasMore).toBe(true);
    expect(first).toMatchObject({
      source: 'tmdb',
      externalId: '438631',
      mediaType: 'movie',
      title: 'Dune',
      year: 2021,
      genres: expect.arrayContaining(['Fantascienza']),
    });
    expect(first?.posterUrl).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w342\//);
    expect(page.results.find((m) => m.externalId === '90228')).toMatchObject({
      mediaType: 'tv',
      title: 'Dune: Prophecy',
    });
  });

  it('drops people from multi search', async () => {
    const fetchImpl = fakeTmdb({ ...genreRoutes, '/search/multi': searchMultiPerson });
    const provider = createTmdbProvider({ accessToken: 'token', fetchImpl });

    const page = await provider.search('denis villeneuve');

    expect(searchMultiPerson.results.some((r) => r.media_type === 'person')).toBe(true);
    expect(page.results.map((m) => m.mediaType)).toEqual(['tv', 'movie']);
  });

  it('uses the movie endpoint with Italian language and region for the movie filter', async () => {
    const fetchImpl = fakeTmdb({ ...genreRoutes, '/search/movie': searchMovie });
    const provider = createTmdbProvider({ accessToken: 'secret-token', fetchImpl });

    const page = await provider.search('dune', { type: 'movie', page: 1 });
    const call = fetchImpl.mock.calls.find(([url]) => url.includes('/search/movie'))!;
    const url = new URL(call[0]);

    expect(url.searchParams.get('language')).toBe('it-IT');
    expect(url.searchParams.get('region')).toBe('IT');
    expect(new Headers(call[1]?.headers).get('authorization')).toBe('Bearer secret-token');
    expect(page.results[1]).toMatchObject({
      title: 'Dune - Parte due',
      originalTitle: 'Dune: Part Two',
    });
  });

  it('returns nothing for books without calling the API', async () => {
    const fetchImpl = fakeTmdb({});
    const provider = createTmdbProvider({ accessToken: 'token', fetchImpl });

    await expect(provider.search('dune', { type: 'book' })).resolves.toMatchObject({ results: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

const movie = (id: number, title: string, votes = 0): TmdbSearchItem => ({
  media_type: 'movie',
  id,
  title,
  vote_count: votes,
});

describe('mergeRankings', () => {
  it('gives each title its best position of the two languages', () => {
    const merged = mergeRankings(
      [
        movie(1, 'Uncovering Spirited Away', 10),
        movie(2, 'Altro', 5),
        movie(3, 'La città incantata', 17000),
      ],
      [movie(3, 'Spirited Away', 17000), movie(1, 'Uncovering Spirited Away', 10)],
    );
    expect(merged.map(({ item }) => item.id)).toEqual([3, 1, 2]);
    // Italian data wins for titles both searches returned.
    expect(merged[0]).toEqual({
      item: expect.objectContaining({ title: 'La città incantata' }),
      english: false,
    });
  });

  it('marks titles only the English search found', () => {
    const merged = mergeRankings(
      [movie(1, 'Omicidio nell’ombra', 20)],
      [movie(9, 'Memories of Murder', 4000)],
    );
    expect(merged).toEqual([
      { item: expect.objectContaining({ id: 9 }), english: true },
      { item: expect.objectContaining({ id: 1 }), english: false },
    ]);
  });

  it('keeps movies and series with the same id apart', () => {
    const series: TmdbSearchItem = { media_type: 'tv', id: 1, name: 'Serie' };
    expect(mergeRankings([movie(1, 'Film')], [series])).toHaveLength(2);
  });
});

describe('TMDB bilingual search', () => {
  const italianPage = {
    page: 1,
    total_pages: 1,
    results: [
      { id: 1, title: 'Omicidio nell’ombra', original_title: 'Memories of Murder', vote_count: 20 },
    ],
  };
  const englishPage = {
    page: 1,
    total_pages: 1,
    results: [
      {
        id: 11423,
        title: 'Memories of Murder',
        original_title: '살인의 추억',
        overview: 'EN',
        vote_count: 4000,
      },
      { id: 1, title: 'Memories of Murder', original_title: 'Memories of Murder', vote_count: 20 },
    ],
  };

  function fetchFor(localized: unknown) {
    return vi.fn<FetchLike>(async (input) => {
      const url = new URL(input);
      const path = url.pathname.replace('/3', '');
      if (path === '/search/movie') {
        return json(url.searchParams.get('language') === 'en-US' ? englishPage : italianPage);
      }
      if (path === '/movie/11423' && localized) return json(localized);
      if (path in genreRoutes) return json(genreRoutes[path as keyof typeof genreRoutes]);
      return new Response(null, { status: 404 });
    });
  }

  it('finds a title by its English name and shows it in Italian', async () => {
    const fetchImpl = fetchFor({
      title: 'Memorie di un assassino',
      overview: 'IT',
      poster_path: '/it.jpg',
    });
    const provider = createTmdbProvider({ accessToken: 'token', fetchImpl });

    const page = await provider.search('memories of murder', { type: 'movie' });

    expect(page.results.map((m) => [m.externalId, m.title])).toEqual([
      ['11423', 'Memorie di un assassino'],
      ['1', 'Omicidio nell’ombra'],
    ]);
    expect(page.results[0]).toMatchObject({ originalTitle: '살인의 추억', overview: 'IT' });
    expect(page.results[0]?.posterUrl).toMatch(/\/it\.jpg$/);
  });

  it('keeps the English data when the Italian one is missing', async () => {
    const provider = createTmdbProvider({ accessToken: 'token', fetchImpl: fetchFor(null) });
    const page = await provider.search('memories of murder', { type: 'movie' });
    expect(page.results[0]).toMatchObject({ title: 'Memories of Murder', overview: 'EN' });
  });
});

describe('TMDB details', () => {
  it('maps movie details', () => {
    const media = mapTmdbMovieDetails(tmdbMovieDetailsSchema.parse(movieDetails));

    expect(media).toMatchObject({
      externalId: '438631',
      mediaType: 'movie',
      title: 'Dune',
      originalTitle: undefined, // same as the Italian title
      year: 2021,
      genres: ['Fantascienza', 'Avventura'],
      extra: { runtime: 155, tagline: "L'inizio di un viaggio straordinario" },
    });
    expect(media.posterUrl).toContain('/w500/');
  });

  it('falls back to the English overview when the Italian one is empty', () => {
    const details = tmdbMovieDetailsSchema.parse({ ...movieDetails, overview: '' });
    const english = movieDetails.translations.translations.find((t) => t.iso_639_1 === 'en')!;

    expect(mapTmdbMovieDetails(details).overview).toBe(english.data.overview);
  });

  it('maps tv details with seasons', () => {
    const media = mapTmdbTvDetails(tmdbTvDetailsSchema.parse(tvDetails));

    expect(media).toMatchObject({
      externalId: '90228',
      mediaType: 'tv',
      title: 'Dune: Prophecy',
      year: 2024,
      extra: {
        numberOfSeasons: 2,
        numberOfEpisodes: 14,
        seasons: expect.arrayContaining([
          expect.objectContaining({ seasonNumber: 1, episodeCount: 6, name: 'Stagione 1' }),
        ]),
      },
    });
  });

  it('requests details with translations and credits appended and rejects invalid ids', async () => {
    const fetchImpl = fakeTmdb({ '/tv/90228': tvDetails });
    const provider = createTmdbProvider({ accessToken: 'token', fetchImpl });

    await provider.getDetails('90228', 'tv');
    const url = new URL(fetchImpl.mock.calls[0]![0]);

    expect(url.searchParams.get('append_to_response')).toBe('translations,aggregate_credits');
    await expect(provider.getDetails('../configuration', 'movie')).rejects.toThrow(
      'Invalid TMDB id',
    );
  });
});

describe('tmdbPosterUrl', () => {
  it('builds sized URLs and handles missing posters', () => {
    expect(tmdbPosterUrl('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    expect(tmdbPosterUrl(null, 'w500')).toBeUndefined();
  });
});
