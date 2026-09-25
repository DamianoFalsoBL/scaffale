import 'server-only';

import { serverEnv } from '@/lib/env.server';

import { createGoogleBooksProvider } from './google-books';
import { createOpenLibraryProvider } from './open-library';
import { searchMedia, type SearchDeps, type SearchFilter } from './search';
import { createTmdbProvider } from './tmdb';
import type { MediaProvider, MediaType, NormalizedMedia, Source } from './types';

function buildDeps(): SearchDeps {
  return {
    tmdb: serverEnv.TMDB_READ_ACCESS_TOKEN
      ? createTmdbProvider({ accessToken: serverEnv.TMDB_READ_ACCESS_TOKEN })
      : undefined,
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

export function search(query: string, type: SearchFilter, page: number) {
  return searchMedia({ query, type, page }, deps);
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

export type { NormalizedMedia, MediaType, Source } from './types';
export type { SearchFilter, UnifiedSearchResult } from './search';
