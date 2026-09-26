import { searchBooks } from './books';
import type { PersonSummary } from './tmdb';
import type { MediaProvider, MediaType, NormalizedMedia } from './types';

export type SearchFilter = MediaType | 'all' | 'person';

export interface PeoplePage {
  people: PersonSummary[];
  page: number;
  hasMore: boolean;
}

/** People shown above the titles in "Tutti". */
export const PEOPLE_PREVIEW_SIZE = 6;
export type SearchGroup = 'screen' | 'books';

export interface SearchDeps {
  tmdb?: MediaProvider;
  google?: MediaProvider;
  openLibrary: MediaProvider;
  people?: (query: string, page: number) => Promise<PeoplePage>;
  onBookFallback?: (reason: unknown) => void;
}

export interface UnifiedSearchResult {
  results: NormalizedMedia[];
  /** Matching people: the whole page for "person", a short preview for "all". */
  people: PersonSummary[];
  page: number;
  hasMore: boolean;
  /** Groups that failed: their results are missing from this page. */
  unavailable: SearchGroup[];
}

export class SearchUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('No search provider is available', options);
    this.name = 'SearchUnavailableError';
  }
}

/** a1, b1, a2, b2, … then whatever is left of the longer list. */
export function interleave<T>(a: readonly T[], b: readonly T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]!);
    if (i < b.length) out.push(b[i]!);
  }
  return out;
}

export async function searchMedia(
  { query, type, page }: { query: string; type: SearchFilter; page: number },
  deps: SearchDeps,
): Promise<UnifiedSearchResult> {
  if (type === 'person') {
    if (!deps.people) throw new SearchUnavailableError();
    try {
      const result = await deps.people(query, page);
      return { results: [], people: result.people, page, hasMore: result.hasMore, unavailable: [] };
    } catch (error) {
      throw new SearchUnavailableError({ cause: error });
    }
  }

  const wantsScreen = type !== 'book';
  const wantsBooks = type === 'book' || type === 'all';
  const wantsPeople = type === 'all' && page === 1 && !!deps.people;
  const mediaType = type === 'all' ? undefined : type;

  const [screen, books, people] = await Promise.allSettled([
    wantsScreen
      ? deps.tmdb
        ? deps.tmdb.search(query, { type: mediaType, page })
        : Promise.reject(new Error('TMDB is not configured'))
      : null,
    wantsBooks ? searchBooks(query, { type: 'book', page }, deps, deps.onBookFallback) : null,
    // A best-effort extra: a failure here never hides the titles.
    wantsPeople ? deps.people!(query, 1) : null,
  ]);

  const unavailable: SearchGroup[] = [];
  if (screen.status === 'rejected') unavailable.push('screen');
  if (books.status === 'rejected') unavailable.push('books');

  const requested = Number(wantsScreen) + Number(wantsBooks);
  if (unavailable.length === requested) {
    const reasons = [screen, books].flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
    throw new SearchUnavailableError({ cause: reasons });
  }

  const screenPage = screen.status === 'fulfilled' ? screen.value : null;
  const booksPage = books.status === 'fulfilled' ? books.value : null;

  return {
    results: interleave(screenPage?.results ?? [], booksPage?.results ?? []),
    people:
      people.status === 'fulfilled' && people.value
        ? people.value.people.slice(0, PEOPLE_PREVIEW_SIZE)
        : [],
    page,
    hasMore: !!screenPage?.hasMore || !!booksPage?.hasMore,
    unavailable,
  };
}
