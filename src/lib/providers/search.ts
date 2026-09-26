import { findGenre, genreBookSubject } from '@/lib/catalogs';
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  discoverParams,
  matchesFilters,
  type SearchFilters,
} from '@/lib/search-filters';

import { searchBooks } from './books';
import type { PersonSummary } from './tmdb';
import {
  EMPTY_PAGE,
  type MediaProvider,
  type MediaType,
  type NormalizedMedia,
  type SearchPage,
} from './types';

export type SearchFilter = MediaType | 'all' | 'person';

export interface PeoplePage {
  people: PersonSummary[];
  page: number;
  hasMore: boolean;
}

/** Below this many filtered text results, the next pages are read too (at most 2 more). */
const MIN_FILTERED_RESULTS = 6;

/** People shown above the titles in "Tutti". */
export const PEOPLE_PREVIEW_SIZE = 6;
export type SearchGroup = 'screen' | 'books';

/**
 * Why some filters had no effect on this page, shown to the user:
 * - books_need_query: Esplora is movies and series only (Google Books has no usable
 *   "popular by genre" list: it ignores langRestrict with subject: and the order is random);
 * - books_skipped: rating, platform or a genre without a book subject leave books out of "all";
 * - provider_explore_only: platforms only filter Esplora (empty query).
 */
export type SearchNote = 'books_need_query' | 'books_skipped' | 'provider_explore_only';

export interface SearchDeps {
  tmdb?: MediaProvider;
  google?: MediaProvider;
  openLibrary: MediaProvider;
  people?: (query: string, page: number) => Promise<PeoplePage>;
  /** TMDB Discover with the params built by discoverParams. */
  discover?: (type: 'movie' | 'tv', params: Record<string, string>) => Promise<SearchPage>;
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
  notes: SearchNote[];
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

interface SearchInput {
  /** Empty (or blank) = Esplora: titles by filters only. */
  query: string;
  type: SearchFilter;
  page: number;
  filters?: SearchFilters;
  /** YYYY-MM-DD, for "newest" in Esplora. */
  today?: string;
}

/** Google Books and Open Library both understand `subject:` in the query. */
function bookSubjectQuery(filters: SearchFilters) {
  const genre = findGenre(filters.genre);
  const subject = genre && genreBookSubject(genre);
  return subject ? `subject:"${subject}"` : undefined;
}

export async function searchMedia(
  { query, type, page, filters = DEFAULT_FILTERS, today }: SearchInput,
  deps: SearchDeps,
): Promise<UnifiedSearchResult> {
  const text = query.trim();

  if (type === 'person') {
    if (!deps.people) throw new SearchUnavailableError();
    try {
      const result = await deps.people(text, page);
      return {
        results: [],
        people: result.people,
        page,
        hasMore: result.hasMore,
        unavailable: [],
        notes: [],
      };
    } catch (error) {
      throw new SearchUnavailableError({ cause: error });
    }
  }

  const notes: SearchNote[] = [];
  const explore = text === '';
  const subject = bookSubjectQuery(filters);

  // Books have no rating or platform, and without a subject their genre can't be checked.
  let wantsBooks = type === 'book' || type === 'all';
  if (type === 'all' && (filters.rating !== undefined || filters.provider || explore)) {
    if (!explore) notes.push('books_skipped');
    wantsBooks = false;
  }
  if (type === 'all' && filters.genre && !subject && wantsBooks) {
    notes.push('books_skipped');
    wantsBooks = false;
  }
  if (type === 'book' && explore) {
    notes.push('books_need_query');
    wantsBooks = false;
  }

  const wantsScreen = type !== 'book';
  const wantsPeople =
    !explore && type === 'all' && page === 1 && !!deps.people && countActiveFilters(filters) === 0;
  if (!explore && filters.provider && wantsScreen) notes.push('provider_explore_only');

  const screenTypes: ('movie' | 'tv')[] =
    type === 'all' ? ['movie', 'tv'] : type === 'book' ? [] : [type];
  const exactYear =
    filters.from !== undefined && filters.from === filters.to ? filters.from : undefined;
  const bookQuery = [text, subject].filter(Boolean).join(' ');

  async function exploreScreen(): Promise<SearchPage> {
    if (!deps.discover) throw new Error('TMDB is not configured');
    const pages = await Promise.all(
      screenTypes.map((screenType) => {
        const date = today ?? new Date().toISOString().slice(0, 10);
        const params = discoverParams(screenType, filters, page, date);
        return params ? deps.discover!(screenType, params) : EMPTY_PAGE(page);
      }),
    );
    return {
      results: pages.map((p) => p.results).reduce((a, b) => interleave(a, b)),
      page,
      hasMore: pages.some((p) => p.hasMore),
    };
  }

  const searchType: MediaType | undefined = type === 'all' ? undefined : type;
  // Discover already applied the filters; text searches are narrowed here.
  const keep = (media: NormalizedMedia) => matchesFilters(media, filters);

  async function fetchPage(current: number) {
    const [screen, books] = await Promise.allSettled([
      !wantsScreen
        ? null
        : explore
          ? exploreScreen()
          : deps.tmdb
            ? deps.tmdb.search(text, {
                type: searchType,
                page: current,
                ...(exactYear !== undefined && { year: exactYear }),
              })
            : Promise.reject(new Error('TMDB is not configured')),
      wantsBooks
        ? searchBooks(bookQuery, { type: 'book', page: current }, deps, deps.onBookFallback)
        : null,
    ]);

    const unavailable: SearchGroup[] = [];
    if (screen.status === 'rejected') unavailable.push('screen');
    if (books.status === 'rejected') unavailable.push('books');

    const requested = Number(wantsScreen) + Number(wantsBooks);
    if (requested > 0 && unavailable.length === requested) {
      const reasons = [screen, books].flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
      throw new SearchUnavailableError({ cause: reasons });
    }

    const screenPage = screen.status === 'fulfilled' ? screen.value : null;
    const booksPage = books.status === 'fulfilled' ? books.value : null;
    return {
      results: interleave(
        (screenPage?.results ?? []).filter((m) => explore || keep(m)),
        (booksPage?.results ?? []).filter(keep),
      ),
      hasMore: !!screenPage?.hasMore || !!booksPage?.hasMore,
      unavailable,
    };
  }

  const [first, people] = await Promise.all([
    fetchPage(page),
    // A best-effort extra: a failure here never hides the titles.
    wantsPeople ? deps.people!(text, 1).catch(() => null) : null,
  ]);

  // Filters can empty a text-search page ("matrix" + Crime): look a little further
  // before answering, and report the last page read so "Carica altri" continues from it.
  let { results, hasMore } = first;
  let lastPage = page;
  const narrowed = !explore && countActiveFilters(filters) > 0;
  while (narrowed && results.length < MIN_FILTERED_RESULTS && hasMore && lastPage < page + 2) {
    try {
      const next = await fetchPage(lastPage + 1);
      lastPage += 1;
      results = [...results, ...next.results];
      hasMore = next.hasMore;
    } catch {
      break;
    }
  }

  return {
    results,
    people: people ? people.people.slice(0, PEOPLE_PREVIEW_SIZE) : [],
    page: lastPage,
    hasMore,
    unavailable: first.unavailable,
    notes: [...new Set(notes)],
  };
}
