'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { findGenre, findWatchProvider, genresFor, WATCH_PROVIDERS } from '@/lib/catalogs';
import type { SearchFilter } from '@/lib/providers/search';
import {
  MIN_RATINGS,
  SEARCH_SORTS,
  SORT_LABELS,
  yearRangeLabel,
  type SearchFilters,
} from '@/lib/search-filters';
import { cn } from '@/lib/utils';

/** Radix Select can't use an empty value. */
const ANY = 'any';

type FilterKey = Exclude<keyof SearchFilters, 'sort'>;

export function SearchFiltersPanel({
  filters,
  type,
  explore,
  onChange,
}: {
  filters: SearchFilters;
  type: SearchFilter;
  /** Empty query: sorting applies (text results keep TMDB's relevance order). */
  explore: boolean;
  onChange: (filters: SearchFilters) => void;
}) {
  const genres = genresFor(type);
  const screen = type !== 'book';
  const set = (changes: Partial<SearchFilters>) => onChange({ ...filters, ...changes });

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
      <Field label="Genere" id="filter-genre" className="col-span-2 sm:col-span-1">
        <Select
          value={filters.genre ?? ANY}
          onValueChange={(value) =>
            set({ genre: value === ANY ? undefined : (value as SearchFilters['genre']) })
          }
        >
          <SelectTrigger id="filter-genre" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Tutti i generi</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre.slug} value={genre.slug}>
                {genre.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <YearField
        label="Dall'anno"
        id="filter-from"
        value={filters.from}
        onChange={(from) => set({ from })}
      />
      <YearField
        label="All'anno"
        id="filter-to"
        value={filters.to}
        onChange={(to) => set({ to })}
      />

      {screen && (
        <Field label="Voto minimo" id="filter-rating">
          <Select
            value={filters.rating ? String(filters.rating) : ANY}
            onValueChange={(value) => set({ rating: value === ANY ? undefined : Number(value) })}
          >
            <SelectTrigger id="filter-rating" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Qualsiasi</SelectItem>
              {MIN_RATINGS.map((rating) => (
                <SelectItem key={rating} value={String(rating)}>
                  {rating}+ su TMDB
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {screen && (
        <Field label="Piattaforma" id="filter-provider">
          <Select
            value={filters.provider ?? ANY}
            onValueChange={(value) =>
              set({ provider: value === ANY ? undefined : (value as SearchFilters['provider']) })
            }
          >
            <SelectTrigger id="filter-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Tutte</SelectItem>
              {WATCH_PROVIDERS.map((provider) => (
                <SelectItem key={provider.slug} value={provider.slug}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {explore && screen && (
        <Field label="Ordina" id="filter-sort">
          <Select
            value={filters.sort}
            onValueChange={(value) => set({ sort: value as SearchFilters['sort'] })}
          >
            <SelectTrigger id="filter-sort" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

const YEAR = /^\d{4}$/;

/** Commits only complete years, so typing "2", "20", "202" doesn't fire searches. */
function YearField({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: number | undefined;
  onChange: (year: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [synced, setSynced] = useState(value);

  // Cleared from outside (a chip or "Azzera"): follow it.
  if (value !== synced) {
    setSynced(value);
    setText(value === undefined ? '' : String(value));
  }

  return (
    <Field label={label} id={id}>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="aaaa"
        maxLength={4}
        value={text}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '');
          setText(next);
          if (next === '') onChange(undefined);
          else if (YEAR.test(next) && Number(next) >= 1870) onChange(Number(next));
        }}
        className="h-8"
      />
    </Field>
  );
}

/** Removable chips for the active filters, plus "Azzera". */
export function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}) {
  const chips: { key: FilterKey | 'years'; label: string }[] = [];
  const genre = findGenre(filters.genre);
  if (genre) chips.push({ key: 'genre', label: genre.label });
  const years = yearRangeLabel(filters);
  if (years) chips.push({ key: 'years', label: years });
  if (filters.rating) chips.push({ key: 'rating', label: `Voto ${filters.rating}+` });
  const provider = findWatchProvider(filters.provider);
  if (provider) chips.push({ key: 'provider', label: provider.label });

  if (chips.length === 0) return null;

  function remove(key: FilterKey | 'years') {
    onChange(
      key === 'years'
        ? { ...filters, from: undefined, to: undefined }
        : { ...filters, [key]: undefined },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Button
          key={chip.key}
          variant="secondary"
          size="sm"
          className="h-7 gap-1 rounded-full pr-2"
          onClick={() => remove(chip.key)}
          aria-label={`Rimuovi filtro ${chip.label}`}
        >
          {chip.label}
          <X className="size-3.5" aria-hidden />
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-muted-foreground"
        onClick={() => onChange({ sort: filters.sort })}
      >
        Azzera filtri
      </Button>
    </div>
  );
}
