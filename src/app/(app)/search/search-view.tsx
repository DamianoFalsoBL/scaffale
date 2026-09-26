'use client';

import { AlertCircle, Info, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { SearchResponse } from '@/app/api/search/route';
import { AddToLibrary } from '@/components/add-to-library';
import { MediaCard, MediaCardSkeleton } from '@/components/media-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SEARCH_FILTER_LABELS } from '@/lib/media-labels';
import type { SearchResultWithLibrary } from '@/lib/library/matching';
import { titleHref } from '@/lib/library/title';
import type { SearchFilter } from '@/lib/providers/search';
import { SEARCH_FILTERS } from '@/lib/validation/search';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

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

async function fetchSearch(q: string, type: SearchFilter, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ q, type, page: String(page) });
  const response = await fetch(`/api/search?${params}`, { signal });

  if (!response.ok) {
    throw new SearchRequestError(response.status);
  }
  return (await response.json()) as SearchResponse;
}

const mediaKey = (media: SearchResultWithLibrary) => `${media.source}:${media.externalId}`;

/** Library titles open their page; the others open the preview. */
function detailsHref(media: SearchResultWithLibrary) {
  return media.library ? `/item/${media.library.mediaItemId}` : titleHref(media);
}

function authorsOf(media: SearchResultWithLibrary) {
  return Array.isArray(media.extra.authors) ? (media.extra.authors as string[]) : [];
}

function appendUnique(current: SearchResultWithLibrary[], next: SearchResultWithLibrary[]) {
  const seen = new Set(current.map(mediaKey));
  return [...current, ...next.filter((media) => !seen.has(mediaKey(media)))];
}

export function SearchView({
  initialQuery,
  initialType,
}: {
  initialQuery: string;
  initialType: SearchFilter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchFilter>(initialType);
  const [state, setState] = useState<SearchState>();

  const q = useDebouncedValue(query, DEBOUNCE_MS).trim();
  const active = q.length >= MIN_QUERY_LENGTH;
  const key = `${type}:${q}`;
  // Results belong to a query: ignore state left over from a previous one.
  const current = state?.key === key ? state : undefined;

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type !== 'all') params.set('type', type);
    const search = params.toString();
    window.history.replaceState(null, '', search ? `/search?${search}` : '/search');
  }, [q, type]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();
    fetchSearch(q, type, 1, controller.signal).then(
      (result) => setState({ key, status: 'done', loadingMore: false, ...result }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key, status: 'error', message: errorMessage(error) });
        }
      },
    );
    return () => controller.abort();
  }, [active, key, q, type]);

  async function loadMore() {
    if (current?.status !== 'done') {
      return;
    }

    setState({ ...current, loadingMore: true });
    try {
      const next = await fetchSearch(q, type, current.page + 1);
      setState((previous) =>
        previous?.key === key && previous.status === 'done'
          ? {
              ...next,
              key,
              status: 'done',
              loadingMore: false,
              results: appendUnique(previous.results, next.results),
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
            placeholder="Cerca film, serie o libri…"
            aria-label="Cerca"
            className="h-10 pl-9"
            autoFocus
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={type}
          onValueChange={(value) => value && setType(value as SearchFilter)}
          aria-label="Filtra per tipo"
        >
          {SEARCH_FILTERS.map((filter) => (
            <ToggleGroupItem key={filter} value={filter} className="px-4">
              {SEARCH_FILTER_LABELS[filter]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {!active ? (
        <p className="py-12 text-center text-muted-foreground">
          Scrivi almeno {MIN_QUERY_LENGTH} caratteri per cercare tra film, serie e libri.
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
          {current.results.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Nessun risultato per “{q}”.</p>
          ) : (
            <ResultsGrid>
              {current.results.map((media) => (
                <MediaCard
                  key={mediaKey(media)}
                  media={{ ...media, authors: authorsOf(media) }}
                  href={detailsHref(media)}
                >
                  {/* Side by side on desktop; stacked full-width on phones, where cards are narrow. */}
                  <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
                    <AddToLibrary media={media} className="px-2 max-sm:w-full" />
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="px-2 text-muted-foreground max-sm:w-full"
                    >
                      <Link href={detailsHref(media)}>
                        <Info aria-hidden />
                        Dettagli
                      </Link>
                    </Button>
                  </div>
                </MediaCard>
              ))}
            </ResultsGrid>
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
