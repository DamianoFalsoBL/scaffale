import { parseExtra } from '@/lib/library/extra';
import type { LibraryEntry } from '@/lib/library/model';
import type { NormalizedMedia } from '@/lib/providers/types';
import { EXCLUDED_TV_GENRES } from '@/lib/search-filters';

/** What the releases page lists for each day, in display order. */
export const RELEASE_KINDS = ['cinema', 'streaming', 'series'] as const;
export type ReleaseKind = (typeof RELEASE_KINDS)[number];

export const RELEASE_KIND_LABELS: Record<ReleaseKind, string> = {
  cinema: 'Al cinema',
  streaming: 'In streaming',
  series: 'Nuova serie',
};

export const RELEASE_TYPES = ['all', 'movie', 'tv'] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
  all: 'Tutto',
  movie: 'Film',
  tv: 'Serie',
};

export function kindsFor(type: ReleaseType): ReleaseKind[] {
  if (type === 'movie') return ['cinema', 'streaming'];
  if (type === 'tv') return ['series'];
  return [...RELEASE_KINDS];
}

/**
 * TMDB Discover query for one kind of release on one day.
 * Movies use the Italian release date (region + release type: 2/3 theatrical, 4 digital),
 * so one day per request gives the right grouping (results only carry the primary date).
 * Series have no per-country date: first episode worldwide, limited to series streaming
 * in Italy with a subscription.
 */
export function releaseDiscover(
  kind: ReleaseKind,
  day: string,
): { type: 'movie' | 'tv'; params: Record<string, string> } {
  const base = { sort_by: 'popularity.desc', page: '1' };
  if (kind === 'series') {
    return {
      type: 'tv',
      params: {
        ...base,
        'first_air_date.gte': day,
        'first_air_date.lte': day,
        watch_region: 'IT',
        with_watch_monetization_types: 'flatrate',
        without_genres: EXCLUDED_TV_GENRES.join(','),
      },
    };
  }
  return {
    type: 'movie',
    params: {
      ...base,
      region: 'IT',
      with_release_type: kind === 'cinema' ? '2|3' : '4',
      'release_date.gte': day,
      'release_date.lte': day,
    },
  };
}

// --- Weeks (ISO dates, Monday first) ---------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string) {
  const weekday = (toDate(iso).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -weekday);
}

export function weekDays(monday: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function isValidDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = toDate(value);
  const year = date.getUTCFullYear();
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value) &&
    year >= 1900 &&
    year <= 2100
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export interface ReleasesParams {
  /** Monday of the shown week. */
  week: string;
  type: ReleaseType;
}

/** `?week=` (any day of the week) and `?type=`; anything invalid falls back to this week / all. */
export function parseReleasesParams(
  searchParams: Record<string, string | string[] | undefined>,
  today: string,
): ReleasesParams {
  const week = single(searchParams.week);
  const type = single(searchParams.type);
  return {
    week: weekStart(week && isValidDate(week) ? week : today),
    type: RELEASE_TYPES.includes(type as ReleaseType) ? (type as ReleaseType) : 'all',
  };
}

/** Link to another week/type; the current week and "all" stay out of the URL. */
export function releasesHref(params: ReleasesParams, today: string) {
  const search = new URLSearchParams();
  if (params.week !== weekStart(today)) search.set('week', params.week);
  if (params.type !== 'all') search.set('type', params.type);
  const query = search.toString();
  return query ? `/releases?${query}` : '/releases';
}

const dayFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const dayMonthFormatter = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "Giovedì 24 settembre". */
export function formatDay(iso: string) {
  const label = dayFormatter.format(toDate(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "21 – 27 settembre 2026", "28 settembre – 4 ottobre 2026". */
export function formatWeek(monday: string) {
  const sunday = addDays(monday, 6);
  const [start, end] = [toDate(monday), toDate(sunday)];
  const year = end.getUTCFullYear();
  const from =
    start.getUTCMonth() === end.getUTCMonth()
      ? String(start.getUTCDate())
      : dayMonthFormatter.format(start) +
        (start.getUTCFullYear() !== year ? ` ${start.getUTCFullYear()}` : '');
  return `${from} – ${dayMonthFormatter.format(end)} ${year}`;
}

// --- Grouping ---------------------------------------------------------------

export interface SeasonPremiere {
  day: string;
  seasonNumber: number;
  entry: LibraryEntry;
}

/** Seasons (≥ 1) of the series in the library that start on one of `days`; dropped series are skipped. */
export function seasonPremieres(entries: LibraryEntry[], days: string[]): SeasonPremiere[] {
  const wanted = new Set(days);
  return entries.flatMap((entry) => {
    if (entry.item.mediaType !== 'tv' || entry.status === 'dropped') return [];
    const parsed = parseExtra('tv', entry.item.extra);
    if (parsed.mediaType !== 'tv') return [];
    return parsed.extra.seasons
      .filter(
        (season) =>
          season.seasonNumber >= 1 && season.airDate && wanted.has(season.airDate.slice(0, 10)),
      )
      .map((season) => ({
        day: season.airDate!.slice(0, 10),
        seasonNumber: season.seasonNumber,
        entry,
      }));
  });
}

export interface ReleaseBatch<T extends NormalizedMedia = NormalizedMedia> {
  day: string;
  kind: ReleaseKind;
  results: T[];
}

export interface ReleaseDay<T extends NormalizedMedia = NormalizedMedia> {
  day: string;
  premieres: SeasonPremiere[];
  titles: { kind: ReleaseKind; media: T }[];
}

const mediaKey = (media: Pick<NormalizedMedia, 'source' | 'mediaType' | 'externalId'>) =>
  `${media.source}:${media.mediaType}:${media.externalId}`;

/**
 * One entry per day, in order. Kinds follow RELEASE_KINDS; a title shows once per day,
 * and a new series already listed as a season premiere of the library isn't repeated.
 */
export function groupReleases<T extends NormalizedMedia>(
  days: string[],
  batches: ReleaseBatch<T>[],
  premieres: SeasonPremiere[],
): ReleaseDay<T>[] {
  return days.map((day) => {
    const dayPremieres = premieres
      .filter((premiere) => premiere.day === day)
      .sort((a, b) => a.entry.item.title.localeCompare(b.entry.item.title, 'it'));
    const seen = new Set(dayPremieres.map((premiere) => mediaKey(premiere.entry.item)));
    const titles: ReleaseDay<T>['titles'] = [];

    for (const kind of RELEASE_KINDS) {
      for (const batch of batches) {
        if (batch.day !== day || batch.kind !== kind) continue;
        for (const media of batch.results) {
          const key = mediaKey(media);
          if (seen.has(key)) continue;
          seen.add(key);
          titles.push({ kind, media });
        }
      }
    }
    return { day, premieres: dayPremieres, titles };
  });
}
