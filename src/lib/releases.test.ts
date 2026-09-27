import { describe, expect, it } from 'vitest';

import type { LibraryEntry } from '@/lib/library/model';
import type { NormalizedMedia } from '@/lib/providers/types';

import {
  addDays,
  formatDay,
  formatWeek,
  groupReleases,
  kindsFor,
  parseReleasesParams,
  releaseDiscover,
  releasesHref,
  seasonPremieres,
  weekDays,
  weekStart,
} from './releases';

const today = '2026-09-27'; // Sunday

function series(
  id: string,
  seasons: { seasonNumber: number; airDate?: string }[],
  status: LibraryEntry['status'] = 'in_progress',
): LibraryEntry {
  return {
    id: `e${id}`,
    status,
    rating: null,
    startedAt: null,
    finishedAt: null,
    timesCompleted: 0,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    watchedSeasons: [],
    listIds: [],
    item: {
      id: `m${id}`,
      mediaType: 'tv',
      source: 'tmdb',
      externalId: id,
      title: `Serie ${id}`,
      originalTitle: null,
      year: 2020,
      posterUrl: null,
      overview: null,
      genres: [],
      isbn13: null,
      extra: {
        seasons: seasons.map((season) => ({ ...season, episodeCount: 8, name: 'S' })),
      },
    },
  };
}

const media = (externalId: string, mediaType: 'movie' | 'tv' = 'movie'): NormalizedMedia => ({
  source: 'tmdb',
  externalId,
  mediaType,
  title: externalId,
  extra: {},
});

describe('weeks', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart(today)).toBe('2026-09-21');
    expect(weekStart('2026-09-21')).toBe('2026-09-21');
    expect(weekDays('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('formats days and weeks in Italian', () => {
    expect(formatDay('2026-09-24')).toBe('Giovedì 24 settembre');
    expect(formatWeek('2026-09-21')).toBe('21 – 27 settembre 2026');
    expect(formatWeek('2026-09-28')).toBe('28 settembre – 4 ottobre 2026');
    expect(formatWeek('2026-12-28')).toBe('28 dicembre 2026 – 3 gennaio 2027');
  });
});

describe('parseReleasesParams', () => {
  it('uses the week of any given day', () => {
    expect(parseReleasesParams({ week: '2026-10-01', type: 'tv' }, today)).toEqual({
      week: '2026-09-28',
      type: 'tv',
    });
  });

  it('falls back to this week and all types', () => {
    for (const week of ['nope', '2026-02-30', '1800-01-01', undefined]) {
      expect(parseReleasesParams({ week, type: 'book' }, today)).toEqual({
        week: '2026-09-21',
        type: 'all',
      });
    }
    expect(parseReleasesParams({ week: ['2026-10-05', 'x'] }, today).week).toBe('2026-10-05');
  });

  it('keeps defaults out of links', () => {
    expect(releasesHref({ week: '2026-09-21', type: 'all' }, today)).toBe('/releases');
    expect(releasesHref({ week: '2026-09-28', type: 'movie' }, today)).toBe(
      '/releases?week=2026-09-28&type=movie',
    );
  });
});

describe('releaseDiscover', () => {
  it('asks for Italian movie releases on one day', () => {
    expect(releaseDiscover('cinema', '2026-09-24')).toEqual({
      type: 'movie',
      params: expect.objectContaining({
        region: 'IT',
        with_release_type: '2|3',
        'release_date.gte': '2026-09-24',
        'release_date.lte': '2026-09-24',
      }),
    });
    expect(releaseDiscover('streaming', '2026-09-24').params.with_release_type).toBe('4');
  });

  it('asks for new series streaming in Italy', () => {
    expect(releaseDiscover('series', '2026-09-24')).toEqual({
      type: 'tv',
      params: expect.objectContaining({
        'first_air_date.gte': '2026-09-24',
        'first_air_date.lte': '2026-09-24',
        watch_region: 'IT',
        with_watch_monetization_types: 'flatrate',
        without_genres: '10763,10766,10767',
      }),
    });
  });

  it('picks kinds by type', () => {
    expect(kindsFor('all')).toEqual(['cinema', 'streaming', 'series']);
    expect(kindsFor('movie')).toEqual(['cinema', 'streaming']);
    expect(kindsFor('tv')).toEqual(['series']);
  });
});

describe('seasonPremieres', () => {
  const days = weekDays('2026-09-21');

  it('finds seasons of library series starting this week', () => {
    const premieres = seasonPremieres(
      [
        series('1', [
          { seasonNumber: 0, airDate: '2026-09-22' },
          { seasonNumber: 1, airDate: '2024-01-01' },
          { seasonNumber: 2, airDate: '2026-09-24' },
        ]),
        series('2', [{ seasonNumber: 3, airDate: '2026-10-01' }, { seasonNumber: 4 }]),
        series('3', [{ seasonNumber: 5, airDate: '2026-09-25' }], 'dropped'),
      ],
      days,
    );
    expect(premieres.map((p) => [p.entry.id, p.seasonNumber, p.day])).toEqual([
      ['e1', 2, '2026-09-24'],
    ]);
  });
});

describe('groupReleases', () => {
  it('groups by day in kind order, once per title, premieres first', () => {
    const days = ['2026-09-24', '2026-09-25'];
    const premiere = { day: '2026-09-24', seasonNumber: 1, entry: series('9', []) };
    const grouped = groupReleases(
      days,
      [
        { day: '2026-09-24', kind: 'series', results: [media('9', 'tv'), media('8', 'tv')] },
        { day: '2026-09-24', kind: 'streaming', results: [media('1')] },
        { day: '2026-09-24', kind: 'cinema', results: [media('1'), media('2')] },
      ],
      [premiere],
    );

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.premieres).toEqual([premiere]);
    expect(grouped[0]?.titles.map((t) => [t.kind, t.media.externalId])).toEqual([
      ['cinema', '1'],
      ['cinema', '2'],
      ['series', '8'],
    ]);
    expect(grouped[1]).toEqual({ day: '2026-09-25', premieres: [], titles: [] });
  });
});
