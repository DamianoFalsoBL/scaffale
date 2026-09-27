import { formatDate } from '@/lib/format';
import type { EntryStatus } from '@/lib/status-labels';

import { parseExtra, type TvExtra } from './extra';
import type { LibraryEntry } from './model';

export interface SeasonInfo {
  number: number;
  name: string;
  episodeCount: number;
  airDate?: string;
  /** Out already: only these count towards "all seen". */
  aired: boolean;
}

export interface SeasonSummary {
  seasons: SeasonInfo[];
  /** Aired seasons. */
  total: number;
  /** Aired seasons marked as seen. */
  watched: number;
  /** First aired season not seen yet. */
  next: number | null;
  allWatched: boolean;
}

/** TMDB series that won't get new seasons. */
const FINISHED_SERIES = new Set(['Ended', 'Canceled']);

export function isSeriesFinished(tvStatus: string | undefined) {
  return !!tvStatus && FINISHED_SERIES.has(tvStatus);
}

/** Regular seasons (specials, season 0, are not tracked); a season without a date isn't out. */
export function seasonList(extra: Pick<TvExtra, 'seasons'>, today: string): SeasonInfo[] {
  return extra.seasons
    .filter((season) => season.seasonNumber >= 1)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .map((season) => ({
      number: season.seasonNumber,
      name: season.name,
      episodeCount: season.episodeCount,
      airDate: season.airDate,
      aired: !!season.airDate && season.airDate <= today,
    }));
}

export function summarizeSeasons(
  extra: Pick<TvExtra, 'seasons'>,
  watchedNumbers: readonly number[],
  today: string,
): SeasonSummary {
  const seasons = seasonList(extra, today);
  const watchedSet = new Set(watchedNumbers);
  const aired = seasons.filter((season) => season.aired);
  const watched = aired.filter((season) => watchedSet.has(season.number)).length;

  return {
    seasons,
    total: aired.length,
    watched,
    next: aired.find((season) => !watchedSet.has(season.number))?.number ?? null,
    allWatched: aired.length > 0 && watched === aired.length,
  };
}

/** Seasons to mark for "fino a qui": every aired one up to `upTo`, included. */
export function seasonsUpTo(summary: SeasonSummary, upTo: number) {
  return summary.seasons
    .filter((season) => season.aired && season.number <= upTo)
    .map((season) => season.number);
}

/**
 * Status after marking seasons as seen (never after removing them):
 * - every aired season seen completes a series that has ended, and puts a running one
 *   "waiting" for its next season;
 * - otherwise the first seasons move a planned, waiting or dropped series to "in progress";
 * - a series the user completed stays completed.
 */
export function statusAfterWatching(
  current: EntryStatus,
  summary: Pick<SeasonSummary, 'watched' | 'allWatched'>,
  tvStatus: string | undefined,
): EntryStatus {
  if (summary.allWatched && isSeriesFinished(tvStatus)) return 'completed';
  if (current === 'completed') return current;
  if (summary.allWatched) return 'waiting';
  if (summary.watched > 0) return 'in_progress';
  return current;
}

/** What a waiting series is waiting for: a season out, announced, or nothing known yet. */
export function waitingNote(summary: SeasonSummary) {
  if (summary.next !== null) return `Stagione ${summary.next} disponibile`;
  const announced = summary.seasons.find((season) => !season.aired);
  if (announced) {
    const date = formatDate(announced.airDate);
    return date
      ? `Stagione ${announced.number} dal ${date}`
      : `Stagione ${announced.number} annunciata`;
  }
  return 'In attesa di una nuova stagione';
}

/**
 * One-line note for library cards: where the user is ("Stagione 3 di 5"), what a waiting
 * series waits for, or a new season out for a series they had finished.
 */
export function seasonNote(status: EntryStatus, summary: SeasonSummary): string | undefined {
  if (status === 'waiting') return waitingNote(summary);
  if (summary.total === 0) return undefined;
  if (status === 'completed') {
    return summary.watched > 0 && summary.next !== null ? 'Nuova stagione' : undefined;
  }
  if (status === 'in_progress' && summary.next !== null) {
    return `Stagione ${summary.next} di ${summary.total}`;
  }
  return undefined;
}

/** A series in the library with an aired season the user hasn't marked as seen. */
export function hasNewSeason(entry: LibraryEntry, today: string) {
  if (entry.item.mediaType !== 'tv') return false;
  const parsed = parseExtra('tv', entry.item.extra);
  return (
    parsed.mediaType === 'tv' &&
    summarizeSeasons(parsed.extra, entry.watchedSeasons, today).next !== null
  );
}
