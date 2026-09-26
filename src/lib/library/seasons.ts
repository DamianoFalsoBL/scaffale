import type { EntryStatus } from '@/lib/status-labels';

import type { TvExtra } from './extra';

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
 * - the first seasons move a planned, paused or dropped series to "in progress";
 * - every aired season seen completes it, but only if the series has ended; a running
 *   series stays "in progress", waiting for the next season.
 */
export function statusAfterWatching(
  current: EntryStatus,
  summary: Pick<SeasonSummary, 'watched' | 'allWatched'>,
  tvStatus: string | undefined,
): EntryStatus {
  if (summary.allWatched && isSeriesFinished(tvStatus)) return 'completed';
  if (summary.watched > 0 && current !== 'completed') return 'in_progress';
  return current;
}

/**
 * One-line note for library cards: where the user is ("Stagione 3 di 5"), or a new
 * season out for a series they had finished.
 */
export function seasonNote(status: EntryStatus, summary: SeasonSummary): string | undefined {
  if (summary.total === 0) return undefined;
  if (status === 'completed') {
    return summary.watched > 0 && summary.next !== null ? 'Nuova stagione' : undefined;
  }
  if (status === 'in_progress' && summary.next !== null) {
    return `Stagione ${summary.next} di ${summary.total}`;
  }
  return undefined;
}
