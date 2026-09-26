import 'server-only';

import { serverEnv } from '@/lib/env.server';
import { todayIso } from '@/lib/library/model';
import type { SearchFilters } from '@/lib/search-filters';

import { createGoogleBooksProvider } from './google-books';
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

/** Cast, directors, where to watch and recommendations for a movie or series. */
export function getTitleExtras(externalId: string, type: 'movie' | 'tv') {
  return requireTmdb().getExtras(externalId, type);
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
