'use client';

import { LayoutGrid, List, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SEARCH_FILTER_LABELS } from '@/lib/media-labels';
import { ENTRY_STATUSES, GENERIC_STATUS_LABELS } from '@/lib/status-labels';
import type { LibraryParams } from '@/lib/validation/library';
import { cn } from '@/lib/utils';

const TYPES = ['all', 'movie', 'tv', 'book'] as const;

const SORT_LABELS: Record<LibraryParams['sort'], string> = {
  added: 'Aggiunti di recente',
  title: 'Titolo (A–Z)',
  rating: 'Voto',
  year: 'Anno',
};

const DEFAULTS: LibraryParams = { type: 'all', status: 'all', sort: 'added', view: 'grid', q: '' };

export function LibraryToolbar({
  params,
  counts,
}: {
  params: LibraryParams;
  counts: Record<(typeof TYPES)[number], number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.q);
  const debouncedQuery = useDebouncedValue(query, 250).trim();

  function navigate(changes: Partial<LibraryParams>) {
    const next = { ...params, ...changes };
    const search = new URLSearchParams();
    for (const key of Object.keys(next) as (keyof LibraryParams)[]) {
      if (next[key] !== DEFAULTS[key]) search.set(key, next[key]);
    }
    const url = search.size ? `${pathname}?${search}` : pathname;
    startTransition(() => router.replace(url, { scroll: false }));
  }

  useEffect(() => {
    if (debouncedQuery !== params.q) {
      navigate({ q: debouncedQuery });
    }
    // Only react to the debounced text; params changes come from navigate itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  return (
    <div className={cn('flex flex-col gap-3 transition-opacity', pending && 'opacity-70')}>
      <Tabs
        value={params.type}
        onValueChange={(type) => navigate({ type: type as LibraryParams['type'] })}
      >
        <TabsList className="w-full sm:w-auto">
          {TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className="gap-1.5">
              {SEARCH_FILTER_LABELS[type]}
              <span className="text-xs text-muted-foreground tabular-nums">{counts[type]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nella libreria…"
            aria-label="Cerca nella libreria"
            className="pl-9"
          />
        </div>

        <Select
          value={params.status}
          onValueChange={(status) => navigate({ status: status as LibraryParams['status'] })}
        >
          <SelectTrigger className="w-44" aria-label="Filtra per stato">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {ENTRY_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {GENERIC_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.sort}
          onValueChange={(sort) => navigate({ sort: sort as LibraryParams['sort'] })}
        >
          <SelectTrigger className="w-48" aria-label="Ordina per">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as LibraryParams['sort'][]).map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          variant="outline"
          value={params.view}
          onValueChange={(view) => view && navigate({ view: view as LibraryParams['view'] })}
          aria-label="Vista"
        >
          <ToggleGroupItem value="grid" aria-label="Griglia">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Lista">
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
