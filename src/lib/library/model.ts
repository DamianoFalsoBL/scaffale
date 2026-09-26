import type { MediaType, NormalizedMedia, Source } from '@/lib/providers/types';
import type { EntryStatus } from '@/lib/status-labels';
import type { Json, Tables, TablesInsert } from '@/lib/supabase/database.types';

export interface LibraryItem {
  id: string;
  mediaType: MediaType;
  source: Source;
  externalId: string;
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  genres: string[];
  isbn13: string | null;
  extra: Record<string, unknown>;
}

export interface LibraryEntry {
  id: string;
  status: EntryStatus;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  timesCompleted: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Seasons marked as seen (TV series only), ascending. */
  watchedSeasons: number[];
  item: LibraryItem;
}

/** Columns selected for library queries (entry + its catalog item + seasons seen). */
export const LIBRARY_SELECT = '*, media_items!inner(*), season_progress(season_number)';

export type LibraryRow = Tables<'user_entries'> & {
  media_items: Tables<'media_items'>;
  season_progress?: { season_number: number }[];
};

export function asRecord(value: Json): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function toLibraryEntry(row: LibraryRow): LibraryEntry {
  const item = row.media_items;

  return {
    id: row.id,
    status: row.status,
    rating: row.rating,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    timesCompleted: row.times_completed,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    watchedSeasons: (row.season_progress ?? [])
      .map((season) => season.season_number)
      .sort((a, b) => a - b),
    item: {
      id: item.id,
      mediaType: item.media_type,
      source: item.source,
      externalId: item.external_id,
      title: item.title,
      originalTitle: item.original_title,
      year: item.year,
      posterUrl: item.poster_url,
      overview: item.overview,
      genres: item.genres,
      isbn13: item.isbn13,
      extra: asRecord(item.extra),
    },
  };
}

/** Catalog row from normalized provider data; refreshes last_synced_at. */
export function toMediaItemRow(
  media: NormalizedMedia,
  now = new Date(),
): TablesInsert<'media_items'> {
  return {
    media_type: media.mediaType,
    source: media.source,
    external_id: media.externalId,
    title: media.title,
    original_title: media.originalTitle ?? null,
    year: media.year ?? null,
    poster_url: media.posterUrl ?? null,
    overview: media.overview ?? null,
    genres: media.genres ?? [],
    isbn13: media.mediaType === 'book' ? (media.isbn13 ?? null) : null,
    extra: JSON.parse(JSON.stringify(media.extra)) as Json,
    last_synced_at: now.toISOString(),
  };
}

/** Today's date (YYYY-MM-DD) in the user's time zone. */
export function todayIso(now = new Date(), timeZone = 'Europe/Rome') {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

export interface EntryProgress {
  status: EntryStatus;
  startedAt: string | null;
  finishedAt: string | null;
  timesCompleted: number;
}

/**
 * Fills dates when the status changes, without overwriting what the user set:
 * - in progress → start date today, if empty;
 * - completed (from another status) → end date today, if empty, and at least one completion.
 */
export function applyStatusDefaults(
  next: EntryProgress,
  previousStatus: EntryStatus | undefined,
  today: string,
): EntryProgress {
  const result = { ...next };

  if (result.status === 'in_progress' && !result.startedAt) {
    result.startedAt = today;
  }

  if (result.status === 'completed' && previousStatus !== 'completed') {
    result.finishedAt ??= today;
    result.timesCompleted = Math.max(result.timesCompleted, 1);
  }

  return result;
}
