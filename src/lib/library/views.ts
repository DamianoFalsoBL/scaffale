import { watchProviderIds, type WatchProviderSlug } from '@/lib/catalogs';
import type { MediaType } from '@/lib/providers/types';
import type { EntryStatus } from '@/lib/status-labels';

import { todayIso, type LibraryEntry } from './model';
import { hasNewSeason } from './seasons';

export type LibrarySort = 'added' | 'title' | 'rating' | 'year';

export interface LibraryFilters {
  type: MediaType | 'all';
  status: EntryStatus | 'all';
  q: string;
  /** A list id; empty or missing = every entry. */
  list?: string;
  /** A streaming platform: only movies and series available on it (see `availability`). */
  provider?: WatchProviderSlug | '';
}

/** Platform ids (TMDB) streaming each catalog item, by item id; missing = unknown. */
export type StreamingAvailability = ReadonlyMap<string, readonly number[]>;

/** Lowercase, without accents: "Perché" matches "perche". */
export function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

const stringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Title, original title and people: book authors, directors/creators, main cast. */
function searchableText(entry: LibraryEntry) {
  const { extra } = entry.item;
  return normalizeText(
    [
      entry.item.title,
      entry.item.originalTitle ?? '',
      ...stringList(extra.authors),
      ...stringList(extra.directors),
      ...stringList(extra.cast),
    ].join(' '),
  );
}

export function filterEntries(
  entries: readonly LibraryEntry[],
  filters: LibraryFilters,
  availability: StreamingAvailability = new Map(),
) {
  const query = normalizeText(filters.q);
  const providerIds = filters.provider ? watchProviderIds(filters.provider) : undefined;

  return entries.filter(
    (entry) =>
      (filters.type === 'all' || entry.item.mediaType === filters.type) &&
      (filters.status === 'all' || entry.status === filters.status) &&
      (!filters.list || entry.listIds.includes(filters.list)) &&
      (!providerIds || (availability.get(entry.item.id) ?? []).some((id) => providerIds.has(id))) &&
      (!query || searchableText(entry).includes(query)),
  );
}

const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });

/** Missing values (no rating, no year) always go last. */
function compareNullable(a: number | null, b: number | null, direction: 1 | -1) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

export function sortEntries(entries: readonly LibraryEntry[], sort: LibrarySort): LibraryEntry[] {
  const byTitle = (a: LibraryEntry, b: LibraryEntry) =>
    collator.compare(a.item.title, b.item.title);
  const byAdded = (a: LibraryEntry, b: LibraryEntry) => b.createdAt.localeCompare(a.createdAt);

  const comparators: Record<LibrarySort, (a: LibraryEntry, b: LibraryEntry) => number> = {
    added: byAdded,
    title: byTitle,
    rating: (a, b) => compareNullable(a.rating, b.rating, -1) || byTitle(a, b),
    year: (a, b) => compareNullable(a.item.year, b.item.year, -1) || byTitle(a, b),
  };

  return [...entries].sort(comparators[sort]);
}

export interface DashboardData {
  inProgress: LibraryEntry[];
  /** Series waiting for a new season; those with one already out first. */
  waiting: LibraryEntry[];
  planned: LibraryEntry[];
  recentlyCompleted: LibraryEntry[];
  completedByType: Record<MediaType, number>;
  completedByYear: { year: number; movie: number; tv: number; book: number; total: number }[];
  totals: { all: number; completed: number; inProgress: number; waiting: number; planned: number };
}

const completionDate = (entry: LibraryEntry) => entry.finishedAt ?? entry.updatedAt.slice(0, 10);

export function buildDashboard(
  entries: readonly LibraryEntry[],
  { limit = 12, today = todayIso() }: { limit?: number; today?: string } = {},
): DashboardData {
  const completed = entries.filter((entry) => entry.status === 'completed');
  const completedByType: Record<MediaType, number> = { movie: 0, tv: 0, book: 0 };
  const byYear = new Map<number, DashboardData['completedByYear'][number]>();

  for (const entry of completed) {
    completedByType[entry.item.mediaType]++;
    const year = Number(completionDate(entry).slice(0, 4));
    const row = byYear.get(year) ?? { year, movie: 0, tv: 0, book: 0, total: 0 };
    row[entry.item.mediaType]++;
    row.total++;
    byYear.set(year, row);
  }

  const byStatus = (status: LibraryEntry['status']) =>
    entries.filter((entry) => entry.status === status);
  const recentlyTouched = (list: LibraryEntry[]) =>
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
  const inProgress = byStatus('in_progress');
  const waiting = byStatus('waiting');
  const planned = byStatus('planned');

  return {
    inProgress: recentlyTouched(inProgress),
    waiting: [...waiting]
      .sort(
        (a, b) =>
          Number(hasNewSeason(b, today)) - Number(hasNewSeason(a, today)) ||
          b.updatedAt.localeCompare(a.updatedAt),
      )
      .slice(0, limit),
    planned: [...planned].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit),
    recentlyCompleted: [...completed]
      .sort((a, b) => completionDate(b).localeCompare(completionDate(a)))
      .slice(0, limit),
    completedByType,
    completedByYear: [...byYear.values()].sort((a, b) => b.year - a.year),
    totals: {
      all: entries.length,
      completed: completed.length,
      inProgress: inProgress.length,
      waiting: waiting.length,
      planned: planned.length,
    },
  };
}
