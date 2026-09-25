import { z } from 'zod';

import { fetchJson, nonEmpty, parseItems, yearFromDate, type FetchLike } from './http';
import {
  EMPTY_PAGE,
  type MediaProvider,
  type MediaType,
  type NormalizedMedia,
  type SearchPage,
} from './types';

const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const LANGUAGE = 'it-IT';
const REGION = 'IT';

const SEARCH_REVALIDATE = 600;
const DETAILS_REVALIDATE = 86_400;
const GENRES_REVALIDATE = 604_800;

export type PosterSize = 'w342' | 'w500';

export function tmdbPosterUrl(path: string | null | undefined, size: PosterSize) {
  return path ? `${IMAGE_BASE}/${size}${path}` : undefined;
}

// --- Raw schemas -----------------------------------------------------------

const posterPath = z.string().nullish();
const optionalText = z.string().nullish();
const genreIds = z.array(z.number().int()).optional();

export const tmdbMovieResultSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  original_title: optionalText,
  release_date: optionalText,
  poster_path: posterPath,
  overview: optionalText,
  genre_ids: genreIds,
});

export const tmdbTvResultSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  original_name: optionalText,
  first_air_date: optionalText,
  poster_path: posterPath,
  overview: optionalText,
  genre_ids: genreIds,
});

const multiResultSchema = z.discriminatedUnion('media_type', [
  tmdbMovieResultSchema.extend({ media_type: z.literal('movie') }),
  tmdbTvResultSchema.extend({ media_type: z.literal('tv') }),
]);

const searchResponseSchema = z.object({
  page: z.number().int(),
  total_pages: z.number().int(),
  results: z.array(z.unknown()),
});

const genreListSchema = z.object({
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })),
});

const translationsSchema = z
  .object({
    translations: z.array(
      z.object({
        iso_639_1: z.string(),
        iso_3166_1: z.string(),
        data: z.object({ overview: optionalText }).loose(),
      }),
    ),
  })
  .optional();

const detailsBase = {
  id: z.number().int(),
  poster_path: posterPath,
  overview: optionalText,
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  translations: translationsSchema,
};

export const tmdbMovieDetailsSchema = z.object({
  ...detailsBase,
  title: z.string().min(1),
  original_title: optionalText,
  release_date: optionalText,
  runtime: z.number().int().nullish(),
  tagline: optionalText,
});

export const tmdbTvDetailsSchema = z.object({
  ...detailsBase,
  name: z.string().min(1),
  original_name: optionalText,
  first_air_date: optionalText,
  last_air_date: optionalText,
  status: optionalText,
  number_of_seasons: z.number().int().nullish(),
  number_of_episodes: z.number().int().nullish(),
  episode_run_time: z.array(z.number().int()).optional(),
  seasons: z
    .array(
      z.object({
        season_number: z.number().int(),
        episode_count: z.number().int(),
        name: z.string(),
        air_date: optionalText,
      }),
    )
    .optional(),
});

export type TmdbMovieResult = z.infer<typeof tmdbMovieResultSchema>;
export type TmdbTvResult = z.infer<typeof tmdbTvResultSchema>;
export type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>;
export type TmdbTvDetails = z.infer<typeof tmdbTvDetailsSchema>;
export type GenreNames = ReadonlyMap<number, string>;

export interface TmdbMovieExtra {
  runtime?: number;
  tagline?: string;
}

export interface TmdbSeason {
  seasonNumber: number;
  episodeCount: number;
  name: string;
  airDate?: string;
}

export interface TmdbTvExtra {
  status?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRuntime?: number;
  lastAirDate?: string;
  seasons: TmdbSeason[];
}

// --- Pure mappers ----------------------------------------------------------

function namesFor(ids: readonly number[] | undefined, genreNames: GenreNames) {
  return (ids ?? []).flatMap((id) => {
    const name = genreNames.get(id);
    return name ? [name] : [];
  });
}

/** An original title equal to the localized one adds nothing. */
function distinct(original: string | null | undefined, title: string) {
  const value = nonEmpty(original);
  return value && value !== title ? value : undefined;
}

export function mapTmdbMovieResult(item: TmdbMovieResult, genreNames: GenreNames): NormalizedMedia {
  return {
    source: 'tmdb',
    externalId: String(item.id),
    mediaType: 'movie',
    title: item.title,
    originalTitle: distinct(item.original_title, item.title),
    year: yearFromDate(item.release_date),
    posterUrl: tmdbPosterUrl(item.poster_path, 'w342'),
    overview: nonEmpty(item.overview),
    genres: namesFor(item.genre_ids, genreNames),
    extra: {},
  };
}

export function mapTmdbTvResult(item: TmdbTvResult, genreNames: GenreNames): NormalizedMedia {
  return {
    source: 'tmdb',
    externalId: String(item.id),
    mediaType: 'tv',
    title: item.name,
    originalTitle: distinct(item.original_name, item.name),
    year: yearFromDate(item.first_air_date),
    posterUrl: tmdbPosterUrl(item.poster_path, 'w342'),
    overview: nonEmpty(item.overview),
    genres: namesFor(item.genre_ids, genreNames),
    extra: {},
  };
}

/** Italian overview, or the English one when TMDB has no Italian translation. */
export function pickOverview(details: TmdbMovieDetails | TmdbTvDetails): string | undefined {
  const english = details.translations?.translations.find(
    (t) => t.iso_639_1 === 'en' && t.iso_3166_1 === 'US',
  );
  return nonEmpty(details.overview) ?? nonEmpty(english?.data.overview);
}

export function mapTmdbMovieDetails(details: TmdbMovieDetails): NormalizedMedia {
  const extra: TmdbMovieExtra = {
    runtime: details.runtime || undefined,
    tagline: nonEmpty(details.tagline),
  };

  return {
    source: 'tmdb',
    externalId: String(details.id),
    mediaType: 'movie',
    title: details.title,
    originalTitle: distinct(details.original_title, details.title),
    year: yearFromDate(details.release_date),
    posterUrl: tmdbPosterUrl(details.poster_path, 'w500'),
    overview: pickOverview(details),
    genres: details.genres?.map((genre) => genre.name) ?? [],
    extra: { ...extra },
  };
}

export function mapTmdbTvDetails(details: TmdbTvDetails): NormalizedMedia {
  const extra: TmdbTvExtra = {
    status: nonEmpty(details.status),
    numberOfSeasons: details.number_of_seasons ?? undefined,
    numberOfEpisodes: details.number_of_episodes ?? undefined,
    episodeRuntime: details.episode_run_time?.[0],
    lastAirDate: nonEmpty(details.last_air_date),
    seasons: (details.seasons ?? []).map((season) => ({
      seasonNumber: season.season_number,
      episodeCount: season.episode_count,
      name: season.name,
      airDate: nonEmpty(season.air_date),
    })),
  };

  return {
    source: 'tmdb',
    externalId: String(details.id),
    mediaType: 'tv',
    title: details.name,
    originalTitle: distinct(details.original_name, details.name),
    year: yearFromDate(details.first_air_date),
    posterUrl: tmdbPosterUrl(details.poster_path, 'w500'),
    overview: pickOverview(details),
    genres: details.genres?.map((genre) => genre.name) ?? [],
    extra: { ...extra },
  };
}

// --- Provider --------------------------------------------------------------

export function createTmdbProvider({
  accessToken,
  fetchImpl,
}: {
  accessToken: string;
  fetchImpl?: FetchLike;
}) {
  const request = <T>(
    path: string,
    params: Record<string, string>,
    schema: z.ZodType<T>,
    revalidate: number,
  ) =>
    fetchJson(`${API_BASE}${path}?${new URLSearchParams({ language: LANGUAGE, ...params })}`, {
      source: 'tmdb',
      schema,
      revalidate,
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      fetchImpl,
    });

  async function genreNames(): Promise<GenreNames> {
    const [movie, tv] = await Promise.all([
      request('/genre/movie/list', {}, genreListSchema, GENRES_REVALIDATE),
      request('/genre/tv/list', {}, genreListSchema, GENRES_REVALIDATE),
    ]);
    return new Map([...movie.genres, ...tv.genres].map((genre) => [genre.id, genre.name]));
  }

  async function searchEndpoint(query: string, type: MediaType | undefined, page: number) {
    const params = { query, page: String(page), include_adult: 'false' };

    if (type === 'movie') {
      return request(
        '/search/movie',
        { ...params, region: REGION },
        searchResponseSchema,
        SEARCH_REVALIDATE,
      );
    }
    if (type === 'tv') {
      return request('/search/tv', params, searchResponseSchema, SEARCH_REVALIDATE);
    }
    return request('/search/multi', params, searchResponseSchema, SEARCH_REVALIDATE);
  }

  const provider: MediaProvider = {
    async search(query, { type, page = 1 } = {}): Promise<SearchPage> {
      if (type === 'book') {
        return EMPTY_PAGE(page);
      }

      const [data, genres] = await Promise.all([searchEndpoint(query, type, page), genreNames()]);

      let results: NormalizedMedia[];
      if (type === 'movie') {
        results = parseItems(data.results, tmdbMovieResultSchema).map((item) =>
          mapTmdbMovieResult(item, genres),
        );
      } else if (type === 'tv') {
        results = parseItems(data.results, tmdbTvResultSchema).map((item) =>
          mapTmdbTvResult(item, genres),
        );
      } else {
        // People (media_type "person") fail the union and are dropped here.
        results = parseItems(data.results, multiResultSchema).map((item) =>
          item.media_type === 'movie'
            ? mapTmdbMovieResult(item, genres)
            : mapTmdbTvResult(item, genres),
        );
      }

      return { results, page, hasMore: data.page < data.total_pages };
    },

    async getDetails(externalId, type) {
      if (!/^\d+$/.test(externalId)) {
        throw new Error(`Invalid TMDB id: ${externalId}`);
      }

      // Translations carry the English overview used when the Italian one is missing.
      const params = { append_to_response: 'translations' };

      if (type === 'movie') {
        return mapTmdbMovieDetails(
          await request(`/movie/${externalId}`, params, tmdbMovieDetailsSchema, DETAILS_REVALIDATE),
        );
      }
      if (type === 'tv') {
        return mapTmdbTvDetails(
          await request(`/tv/${externalId}`, params, tmdbTvDetailsSchema, DETAILS_REVALIDATE),
        );
      }
      throw new Error(`TMDB has no ${type} details`);
    },
  };

  return provider;
}
