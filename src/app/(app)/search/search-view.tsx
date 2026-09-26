'use client';

import { AlertCircle, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { SearchResponse } from '@/app/api/search/route';
import { MediaCardSkeleton } from '@/components/media-card';
import { PersonCard } from '@/components/person-card';
import { ResultCard } from '@/components/result-card';
import { Shelf } from '@/components/shelf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SEARCH_FILTER_LABELS } from '@/lib/media-labels';
import type { SearchResultWithLibrary } from '@/lib/library/matching';
import type { SearchFilter } from '@/lib/providers/search';
import type { PersonSummary } from '@/lib/providers/tmdb';
import {
  countActiveFilters,
  filtersForType,
  filtersToEntries,
  SORT_LABELS,
  type SearchFilters,
} from '@/lib/search-filters';
import { MIN_QUERY_LENGTH, SEARCH_FILTERS } from '@/lib/validation/search';

import { ActiveFilterChips, SearchFiltersPanel } from './search-filters-panel';

const DEBOUNCE_MS = 300;

const NOTE_MESSAGES: Record<SearchResponse['notes'][number], string> = {
  books_need_query:
    'Esplora vale per film e serie. Per i libri scrivi un titolo o un autore: genere e anno restringono i risultati.',
  books_skipped:
    'I libri non compaiono: voto, piattaforma e alcuni generi valgono solo per film e serie.',
  provider_explore_only:
    'Il filtro piattaforma vale solo in Esplora, cioè con la barra di ricerca vuota.',
};

const UNAVAILABLE_MESSAGES: Record<SearchResponse['unavailable'][number], string> = {
  screen: 'Film e serie non sono disponibili al momento.',
  books: 'I libri non sono disponibili al momento.',
};

type SearchState =
  | ({ key: string; status: 'done'; loadingMore: boolean } & SearchResponse)
  | { key: string; status: 'error'; message: string };

class SearchRequestError extends Error {
  constructor(readonly status: number) {
    super(`Search failed with ${status}`);
  }
}

function errorMessage(error: unknown) {
  if (error instanceof SearchRequestError && error.status === 401) {
    return 'La sessione è scaduta. Ricarica la pagina e accedi di nuovo.';
  }
  return 'La ricerca non è disponibile al momento. Riprova tra poco.';
}

async function fetchSearch(
  q: string,
  type: SearchFilter,
  filters: SearchFilters,
  page: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ q, type, page: String(page) });
  if (type !== 'person') {
    for (const [key, value] of filtersToEntries(filters)) params.set(key, value);
  }
  const response = await fetch(`/api/search?${params}`, { signal });

  if (!response.ok) {
    throw new SearchRequestError(response.status);
  }
  return (await response.json()) as SearchResponse;
}

const mediaKey = (media: SearchResultWithLibrary) => `${media.source}:${media.externalId}`;

function appendUnique(current: SearchResultWithLibrary[], next: SearchResultWithLibrary[]) {
  const seen = new Set(current.map(mediaKey));
  return [...current, ...next.filter((media) => !seen.has(mediaKey(media)))];
}

function appendPeople(current: PersonSummary[], next: PersonSummary[]) {
  const seen = new Set(current.map((person) => person.id));
  return [...current, ...next.filter((person) => !seen.has(person.id))];
}

function personDetail(person: PersonSummary) {
  return [person.department, person.knownFor[0]].filter(Boolean).join(' · ') || undefined;
}

export function SearchView({
  initialQuery,
  initialType,
  initialFilters,
}: {
  initialQuery: string;
  initialType: SearchFilter;
  initialFilters: SearchFilters;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchFilter>(initialType);
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(countActiveFilters(initialFilters) > 0);
  const [state, setState] = useState<SearchState>();

  const q = useDebouncedValue(query, DEBOUNCE_MS).trim();
  // Empty query = Esplora (popular titles, narrowed by the filters).
  const explore = q === '' && type !== 'person';
  const active = explore || q.length >= MIN_QUERY_LENGTH;
  const filterQuery =
    type === 'person' ? '' : String(new URLSearchParams(filtersToEntries(filters)));
  const activeFilters = countActiveFilters(filters);
  const key = `${type}:${q}:${filterQuery}`;
  // Results belong to a query: ignore state left over from a previous one.
  const current = state?.key === key ? state : undefined;

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type !== 'all') params.set('type', type);
    for (const [name, value] of new URLSearchParams(filterQuery)) params.set(name, value);
    const search = params.toString();
    window.history.replaceState(null, '', search ? `/search?${search}` : '/search');
  }, [q, type, filterQuery]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();
    fetchSearch(q, type, filters, 1, controller.signal).then(
      (result) => setState({ key, status: 'done', loadingMore: false, ...result }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, status: 'error', message: errorMessage(error) });
        }
      },
    );
    return () => controller.abort();
    // key already covers q, type and the filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  async function loadMore() {
    if (current?.status !== 'done') {
      return;
    }

    setState({ ...current, loadingMore: true });
    try {
      const next = await fetchSearch(q, type, filters, current.page + 1);
      setState((previous) =>
        previous?.key === key && previous.status === 'done'
          ? {
              ...next,
              key,
              status: 'done',
              loadingMore: false,
              results: appendUnique(previous.results, next.results),
              people: appendPeople(previous.people, next.people),
            }
          : previous,
      );
    } catch (error) {
      setState({ key, status: 'error', message: errorMessage(error) });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca film, serie, libri o persone…"
            aria-label="Cerca"
            className="h-10 pl-9"
            autoFocus
          />
        </div>
        {/* Scrolls sideways on narrow phones instead of wrapping. */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ToggleGroup
            type="single"
            variant="outline"
            value={type}
            onValueChange={(value) => {
              if (!value) return;
              setType(value as SearchFilter);
              setFilters((current) => filtersForType(current, value as SearchFilter));
            }}
            aria-label="Filtra per tipo"
          >
            {SEARCH_FILTERS.map((filter) => (
              <ToggleGroupItem key={filter} value={filter} className="px-4">
                {SEARCH_FILTER_LABELS[filter]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {type !== 'person' && (
          <>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              className="self-start"
              onClick={() => setShowFilters((open) => !open)}
              aria-expanded={showFilters}
              aria-controls="search-filters"
            >
              <SlidersHorizontal aria-hidden />
              Filtri
              {activeFilters > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                  {activeFilters}
                </span>
              )}
            </Button>
            {showFilters && (
              <div id="search-filters">
                <SearchFiltersPanel
                  filters={filters}
                  type={type}
                  explore={explore}
                  onChange={setFilters}
                />
              </div>
            )}
            <ActiveFilterChips filters={filters} onChange={setFilters} />
          </>
        )}
      </div>

      {!active ? (
        <p className="py-12 text-center text-muted-foreground">
          {type === 'person'
            ? `Scrivi almeno ${MIN_QUERY_LENGTH} caratteri per cercare un attore, un regista o un autore.`
            : `Scrivi almeno ${MIN_QUERY_LENGTH} caratteri, oppure svuota la ricerca per esplorare.`}
        </p>
      ) : !current ? (
        <ResultsGrid aria-busy>
          {Array.from({ length: 10 }, (_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </ResultsGrid>
      ) : current.status === 'error' ? (
        <p
          className="flex items-center justify-center gap-2 py-12 text-center text-destructive"
          role="alert"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {current.message}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {current.unavailable.map((group) => (
            <p key={group} className="text-sm text-muted-foreground" role="status">
              {UNAVAILABLE_MESSAGES[group]}
            </p>
          ))}
          {current.notes.map((note) => (
            <p key={note} className="text-sm text-muted-foreground" role="status">
              {NOTE_MESSAGES[note]}
            </p>
          ))}
          {explore && current.results.length > 0 && (
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold">Esplora</h2>
              <span className="text-sm text-muted-foreground">{SORT_LABELS[filters.sort]}</span>
            </div>
          )}
          {type === 'person' ? (
            current.people.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                Nessuna persona trovata per “{q}”.
              </p>
            ) : (
              <ResultsGrid>
                {current.people.map((person) => (
                  <PersonCard
                    key={person.id}
                    id={person.id}
                    name={person.name}
                    profileUrl={person.profileUrl}
                    detail={personDetail(person)}
                  />
                ))}
              </ResultsGrid>
            )
          ) : (
            <>
              {current.people.length > 0 && (
                <Shelf title="Persone">
                  {current.people.map((person) => (
                    <PersonCard
                      key={person.id}
                      id={person.id}
                      name={person.name}
                      profileUrl={person.profileUrl}
                      detail={personDetail(person)}
                      className="w-28 shrink-0 snap-start sm:w-32"
                    />
                  ))}
                </Shelf>
              )}
              {current.results.length === 0 ? (
                current.notes.includes('books_need_query') ? null : (
                  <p className="py-12 text-center text-muted-foreground">
                    {explore
                      ? 'Nessun titolo con questi filtri.'
                      : activeFilters > 0
                        ? `Nessun titolo per “${q}” con questi filtri.`
                        : `Nessun titolo trovato per “${q}”.`}
                  </p>
                )
              ) : (
                <ResultsGrid>
                  {current.results.map((media) => (
                    <ResultCard key={mediaKey(media)} media={media} />
                  ))}
                </ResultsGrid>
              )}
            </>
          )}
          {current.hasMore && (
            <Button
              variant="outline"
              className="self-center"
              onClick={loadMore}
              disabled={current.loadingMore}
            >
              {current.loadingMore && <Loader2 className="animate-spin" aria-hidden />}
              Carica altri
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ResultsGrid(props: React.ComponentProps<'div'>) {
  return (
    <div
      className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      {...props}
    />
  );
}
