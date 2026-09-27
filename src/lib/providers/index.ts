import 'server-only';

import { cache } from 'react';

import { serverEnv } from '@/lib/env.server';
import { todayIso } from '@/lib/library/model';
import { releaseDiscover, type ReleaseBatch, type ReleaseKind } from '@/lib/releases';
import type { SearchFilters } from '@/lib/search-filters';

import { createGoogleBooksProvider } from './google-books';
import { forEachLimited } from './http';
import { createOpenLibraryProvider } from './open-library';
import { searchMedia, type SearchDeps, type SearchFilter } from './search';
import { createTmdbProvider } from './tmdb';
import type { MediaProvider, MediaType, NormalizedMedia, Source } from './types';

const tmdb = serverEnv.TMDB_READ_ACCESS_TOKEN
  ? createTmdbProvider({ accessToken: serverEnv.TMDB_READ_ACCESS_TOKEN })
  : undefined;

function buildDeps(): SearchDeps {
  return {
    tmdb,
    people: tmdb ? (query, page) => tmdb.searchPeople(query, page) : undefined,
    discover: tmdb ? (type, params) => tmdb.discover(type, params) : undefined,
    google: serverEnv.GOOGLE_BOOKS_API_KEY
      ? createGoogleBooksProvider({ apiKey: serverEnv.GOOGLE_BOOKS_API_KEY })
      : undefined,
    openLibrary: createOpenLibraryProvider(),
    onBookFallback: (reason) => {
      if (reason !== 'no_results') {
        console.warn('Google Books unavailable, falling back to Open Library', {
          reason: reason instanceof Error ? reason.message : reason,
        });
      }
    },
  };
}

const deps = buildDeps();

export function search(query: string, type: SearchFilter, page: number, filters?: SearchFilters) {
  return searchMedia({ query, type, page, filters, today: todayIso() }, deps);
}

export function getDetails(
  source: Source,
  externalId: string,
  type: MediaType,
): Promise<NormalizedMedia> {
  const providers: Record<Source, MediaProvider | undefined> = {
    tmdb: deps.tmdb,
    google_books: deps.google,
    open_library: deps.openLibrary,
  };
  const provider = providers[source];

  if (!provider) {
    throw new Error(`Provider ${source} is not configured`);
  }
  return provider.getDetails(externalId, type);
}

function requireTmdb() {
  if (!tmdb) throw new Error('TMDB is not configured');
  return tmdb;
}

/**
 * Cast, directors, where to watch and recommendations for a movie or series.
 * Deduplicated per request: the detail page reads it from two sections.
 */
export const getTitleExtras = cache((externalId: string, type: 'movie' | 'tv') =>
  requireTmdb().getExtras(externalId, type),
);

/** Release calendars change a few times a day at most. */
const RELEASES_REVALIDATE = 21_600;

/**
 * Movies and series out in Italy on each day, one Discover request per day and kind.
 * A failed request leaves that day/kind empty and sets `incomplete`.
 */
export async function getReleases(days: string[], kinds: ReleaseKind[]) {
  const client = requireTmdb();
  const jobs = days.flatMap((day) => kinds.map((kind) => ({ day, kind })));
  const settled = await Promise.allSettled(
    jobs.map(({ day, kind }) => {
      const { type, params } = releaseDiscover(kind, day);
      return client.discover(type, params, RELEASES_REVALIDATE);
    }),
  );

  const batches: ReleaseBatch[] = jobs.map((job, i) => {
    const outcome = settled[i];
    return { ...job, results: outcome?.status === 'fulfilled' ? outcome.value.results : [] };
  });
  const failures = settled.filter((outcome) => outcome.status === 'rejected');
  if (failures.length > 0) {
    console.warn('Some release requests failed', {
      failed: failures.length,
      reason: String(failures[0]?.reason),
    });
  }
  return { batches, incomplete: failures.length > 0 };
}

/**
 * Streaming platforms (subscription or free, in Italy) of catalog items, keyed by item id.
 * One cached request per title, 8 at a time; titles whose request failed are left out.
 */
export async function getStreamingAvailability(
  items: { id: string; externalId: string; mediaType: 'movie' | 'tv' }[],
) {
  const client = requireTmdb();
  const available = new Map<string, number[]>();
  let failed = 0;

  await forEachLimited(items, 8, async (item) => {
    try {
      available.set(item.id, await client.getStreamingProviderIds(item.externalId, item.mediaType));
    } catch (error) {
      failed++;
      console.warn('Streaming availability unavailable', { id: item.id, error: String(error) });
    }
  });
  return { available, failed };
}

export function getPerson(id: number) {
  return requireTmdb().getPerson(id);
}

export type { NormalizedMedia, MediaType, Source } from './types';
export type {
  CreditItem,
  PersonCredit,
  PersonDetails,
  PersonSummary,
  TitleExtras,
  WatchProvider,
  WatchProviders,
} from './tmdb';
export type { SearchFilter, SearchNote, UnifiedSearchResult } from './search';
