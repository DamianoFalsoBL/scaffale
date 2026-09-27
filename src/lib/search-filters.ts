import { z } from 'zod';

import {
  findGenre,
  findWatchProvider,
  GENRE_SLUGS,
  genresFor,
  genreTmdbIds,
  WATCH_PROVIDER_SLUGS,
} from '@/lib/catalogs';
import type { MediaType, NormalizedMedia } from '@/lib/providers/types';

export const SEARCH_SORTS = ['popular', 'rating', 'newest'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SORT_LABELS: Record<SearchSort, string> = {
  popular: 'Più popolari',
  rating: 'Voto più alto',
  newest: 'Più recenti',
};

export const MIN_RATINGS = [6, 7, 8] as const;

const year = z.coerce.number().int().min(1870).max(2100).optional().catch(undefined);

/** Filters from the URL; anything invalid is dropped instead of failing the page. */
export const searchFiltersSchema = z.object({
  genre: z.enum(GENRE_SLUGS).optional().catch(undefined),
  from: year,
  to: year,
  rating: z.coerce.number().int().min(1).max(9).optional().catch(undefined),
  provider: z.enum(WATCH_PROVIDER_SLUGS).optional().catch(undefined),
  sort: z.enum(SEARCH_SORTS).catch('popular'),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export const DEFAULT_FILTERS: SearchFilters = { sort: 'popular' };

export const FILTER_KEYS = ['genre', 'from', 'to', 'rating', 'provider', 'sort'] as const;

/** Filters that narrow the results (sorting doesn't count). */
export function countActiveFilters(filters: SearchFilters) {
  const years = filters.from !== undefined || filters.to !== undefined ? 1 : 0;
  return years + [filters.genre, filters.rating, filters.provider].filter(Boolean).length;
}

/** Only non-default values, so URLs stay short. */
export function filtersToEntries(filters: SearchFilters): [string, string][] {
  return FILTER_KEYS.flatMap((key) => {
    const value = filters[key];
    if (value === undefined || (key === 'sort' && value === 'popular')) return [];
    return [[key, String(value)]];
  });
}

/** Drops the filters that can't apply to a type (horror series, a platform for books…). */
export function filtersForType(
  filters: SearchFilters,
  type: MediaType | 'all' | 'person',
): SearchFilters {
  const genreFits = genresFor(type).some((genre) => genre.slug === filters.genre);
  const isBook = type === 'book';
  return {
    ...filters,
    genre: genreFits ? filters.genre : undefined,
    rating: isBook ? undefined : filters.rating,
    provider: isBook ? undefined : filters.provider,
  };
}

/** "dal 2020", "fino al 1999", "2021", "2010–2019". */
export function yearRangeLabel({ from, to }: Pick<SearchFilters, 'from' | 'to'>) {
  if (from !== undefined && to !== undefined) return from === to ? `${from}` : `${from}–${to}`;
  if (from !== undefined) return `dal ${from}`;
  if (to !== undefined) return `fino al ${to}`;
  return undefined;
}

/**
 * Vote floors for Discover. Without one, "newest" is all titles nobody has seen yet and
 * "popular" series are full of untranslated dailies; a TMDB average needs more votes.
 */
const MIN_VOTES = { browse: 10, popularSeries: 50, rated: 100, topRated: 300 };

/** News, soap and talk shows swamp the series lists (TMDB tv genre ids). */
export const EXCLUDED_TV_GENRES = [10763, 10766, 10767];

/**
 * Filters applied to text-search results, where TMDB only accepts an exact year:
 * year range, genre and minimum rating are checked here. Books only get the year check
 * (their genre goes into the query as a subject).
 */
export function matchesFilters(media: NormalizedMedia, filters: SearchFilters): boolean {
  if (filters.from !== undefined || filters.to !== undefined) {
    if (media.year === undefined) return false;
    if (filters.from !== undefined && media.year < filters.from) return false;
    if (filters.to !== undefined && media.year > filters.to) return false;
  }

  if (media.mediaType === 'book') return true;

  const genre = findGenre(filters.genre);
  if (genre) {
    const ids = genreTmdbIds(genre, media.mediaType);
    if (!media.genreIds?.some((id) => ids.includes(id))) return false;
  }

  if (filters.rating !== undefined) {
    const { rating } = media;
    if (!rating || rating.count < MIN_VOTES.browse || rating.average < filters.rating) return false;
  }

  return true;
}

/**
 * Query parameters for TMDB /discover/{movie,tv}. Returns null when the chosen genre
 * doesn't exist for that type (e.g. horror series), so the caller can skip it.
 */
export function discoverParams(
  type: 'movie' | 'tv',
  filters: SearchFilters,
  page: number,
  today: string,
): Record<string, string> | null {
  const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  const params: Record<string, string> = {
    page: String(page),
    include_adult: 'false',
    sort_by: {
      popular: 'popularity.desc',
      rating: 'vote_average.desc',
      newest: `${dateField}.desc`,
    }[filters.sort],
  };

  const votes =
    filters.sort === 'rating'
      ? MIN_VOTES.topRated
      : filters.rating !== undefined
        ? MIN_VOTES.rated
        : type === 'tv' && filters.sort === 'popular'
          ? MIN_VOTES.popularSeries
          : MIN_VOTES.browse;
  params['vote_count.gte'] = String(votes);
  if (type === 'tv') params.without_genres = EXCLUDED_TV_GENRES.join(',');
  if (filters.sort === 'newest') {
    params[`${dateField}.lte`] = today;
  }

  const genre = findGenre(filters.genre);
  if (genre) {
    const ids = genreTmdbIds(genre, type);
    if (ids.length === 0) return null;
    params.with_genres = ids.join('|');
  }

  if (filters.from !== undefined) params[`${dateField}.gte`] = `${filters.from}-01-01`;
  if (filters.to !== undefined) {
    const end = `${filters.to}-12-31`;
    params[`${dateField}.lte`] =
      params[`${dateField}.lte`] && params[`${dateField}.lte`]! < end
        ? params[`${dateField}.lte`]!
        : end;
  }
  if (filters.rating !== undefined) params['vote_average.gte'] = String(filters.rating);

  const provider = findWatchProvider(filters.provider);
  if (provider) {
    params.with_watch_providers = String(provider.id);
    params.watch_region = 'IT';
    params.with_watch_monetization_types = 'flatrate|free|ads';
  }

  return params;
}
