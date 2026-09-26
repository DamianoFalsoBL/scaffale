import { describe, expect, it } from 'vitest';

import type { NormalizedMedia } from '@/lib/providers/types';

import { markLibraryEntries } from './matching';
import {
  applyStatusDefaults,
  todayIso,
  toLibraryEntry,
  toMediaItemRow,
  type LibraryEntry,
  type LibraryRow,
} from './model';
import { buildDashboard, filterEntries, normalizeText, sortEntries } from './views';

let seq = 0;
function entry(
  overrides: Omit<Partial<LibraryEntry>, 'item'> & { item?: Partial<LibraryEntry['item']> } = {},
) {
  seq++;
  const { item, ...rest } = overrides;
  return {
    id: `e${seq}`,
    status: 'planned',
    rating: null,
    startedAt: null,
    finishedAt: null,
    timesCompleted: 0,
    notes: null,
    createdAt: `2026-01-${String(seq).padStart(2, '0')}T10:00:00Z`,
    updatedAt: `2026-01-${String(seq).padStart(2, '0')}T10:00:00Z`,
    ...rest,
    item: {
      id: `m${seq}`,
      mediaType: 'movie',
      source: 'tmdb',
      externalId: String(seq),
      title: `Title ${seq}`,
      originalTitle: null,
      year: 2000,
      posterUrl: null,
      overview: null,
      genres: [],
      isbn13: null,
      extra: {},
      ...item,
    },
  } satisfies LibraryEntry;
}

describe('applyStatusDefaults', () => {
  const today = '2026-09-25';
  const base = { startedAt: null, finishedAt: null, timesCompleted: 0 };

  it('sets the start date when a title goes in progress', () => {
    expect(applyStatusDefaults({ ...base, status: 'in_progress' }, 'planned', today)).toMatchObject(
      {
        startedAt: today,
      },
    );
  });

  it('keeps a start date the user already set', () => {
    const result = applyStatusDefaults(
      { ...base, status: 'in_progress', startedAt: '2026-01-01' },
      'planned',
      today,
    );
    expect(result.startedAt).toBe('2026-01-01');
  });

  it('sets the end date and one completion when a title is completed', () => {
    expect(
      applyStatusDefaults({ ...base, status: 'completed' }, 'in_progress', today),
    ).toMatchObject({
      finishedAt: today,
      timesCompleted: 1,
    });
  });

  it('does not touch a title that was already completed', () => {
    const result = applyStatusDefaults({ ...base, status: 'completed' }, 'completed', today);
    expect(result).toMatchObject({ finishedAt: null, timesCompleted: 0 });
  });

  it('keeps higher completion counts', () => {
    const result = applyStatusDefaults(
      { ...base, status: 'completed', timesCompleted: 3 },
      'planned',
      today,
    );
    expect(result.timesCompleted).toBe(3);
  });
});

describe('todayIso', () => {
  it('uses the Rome time zone', () => {
    // 23:30 UTC on Sep 25 is already Sep 26 in Rome.
    expect(todayIso(new Date('2026-09-25T23:30:00Z'))).toBe('2026-09-26');
  });
});

describe('row mapping', () => {
  it('maps normalized media to a catalog row, dropping ISBNs for non-books', () => {
    const media: NormalizedMedia = {
      source: 'tmdb',
      externalId: '438631',
      mediaType: 'movie',
      title: 'Dune',
      year: 2021,
      isbn13: '9788834622377',
      extra: { runtime: 155, missing: undefined },
    };

    expect(toMediaItemRow(media, new Date('2026-09-25T00:00:00Z'))).toMatchObject({
      external_id: '438631',
      original_title: null,
      isbn13: null,
      extra: { runtime: 155 },
      last_synced_at: '2026-09-25T00:00:00.000Z',
    });
  });

  it('maps a joined row to a library entry', () => {
    const row = {
      id: 'e1',
      user_id: 'u1',
      media_item_id: 'm1',
      status: 'completed',
      rating: 8,
      started_at: null,
      finished_at: '2026-05-01',
      times_completed: 1,
      notes: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
      media_items: {
        id: 'm1',
        media_type: 'book',
        source: 'google_books',
        external_id: 'abc',
        title: 'Il nome della rosa',
        original_title: null,
        year: 1980,
        poster_url: null,
        overview: null,
        genres: [],
        isbn13: '9788845210662',
        extra: { authors: ['Umberto Eco'] },
        last_synced_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    } satisfies LibraryRow;

    expect(toLibraryEntry(row)).toMatchObject({
      rating: 8,
      finishedAt: '2026-05-01',
      item: { mediaType: 'book', extra: { authors: ['Umberto Eco'] } },
    });
  });
});

describe('filterEntries', () => {
  const entries = [
    entry({ status: 'completed', item: { title: 'Perché no', mediaType: 'movie' } }),
    entry({
      status: 'planned',
      item: { title: 'Dune', mediaType: 'book', extra: { authors: ['Frank Herbert'] } },
    }),
    entry({
      status: 'in_progress',
      item: { title: 'Dark', mediaType: 'tv', originalTitle: 'Dark' },
    }),
  ];

  it('filters by type and status', () => {
    expect(filterEntries(entries, { type: 'book', status: 'all', q: '' })).toHaveLength(1);
    expect(filterEntries(entries, { type: 'all', status: 'completed', q: '' })).toHaveLength(1);
    expect(filterEntries(entries, { type: 'tv', status: 'completed', q: '' })).toHaveLength(0);
  });

  it('searches titles and authors ignoring accents and case', () => {
    expect(filterEntries(entries, { type: 'all', status: 'all', q: 'perche' })).toHaveLength(1);
    expect(filterEntries(entries, { type: 'all', status: 'all', q: 'HERBERT' })).toHaveLength(1);
    expect(normalizeText(' Città ')).toBe('citta');
  });

  it('finds titles by director or cast', () => {
    const withPeople = [
      entry({
        item: { title: 'Dune', extra: { directors: ['Denis Villeneuve'], cast: ['Zendaya'] } },
      }),
      entry({ item: { title: 'Altro' } }),
    ];

    expect(filterEntries(withPeople, { type: 'all', status: 'all', q: 'villeneuve' })).toHaveLength(
      1,
    );
    expect(filterEntries(withPeople, { type: 'all', status: 'all', q: 'zendaya' })).toHaveLength(1);
  });
});

describe('sortEntries', () => {
  const a = entry({ rating: 6, item: { title: 'Zorro', year: 1998 } });
  const b = entry({ rating: null, item: { title: 'alien', year: null } });
  const c = entry({ rating: 10, item: { title: 'Éden', year: 2020 } });

  it('sorts by date added, newest first', () => {
    expect(sortEntries([a, b, c], 'added').map((e) => e.id)).toEqual([c.id, b.id, a.id]);
  });

  it('sorts titles in Italian order, ignoring case and accents', () => {
    expect(sortEntries([a, b, c], 'title').map((e) => e.item.title)).toEqual([
      'alien',
      'Éden',
      'Zorro',
    ]);
  });

  it('puts missing ratings and years last', () => {
    expect(sortEntries([b, a, c], 'rating').map((e) => e.id)).toEqual([c.id, a.id, b.id]);
    expect(sortEntries([b, a, c], 'year').map((e) => e.id)).toEqual([c.id, a.id, b.id]);
  });
});

describe('buildDashboard', () => {
  it('builds sections and completion stats', () => {
    const entries = [
      entry({ status: 'completed', finishedAt: '2025-12-31', item: { mediaType: 'movie' } }),
      entry({ status: 'completed', finishedAt: '2026-03-01', item: { mediaType: 'book' } }),
      entry({ status: 'completed', finishedAt: '2026-04-01', item: { mediaType: 'book' } }),
      entry({ status: 'in_progress', item: { mediaType: 'tv' } }),
      entry({ status: 'planned' }),
      entry({ status: 'on_hold', item: { mediaType: 'tv' } }),
    ];

    const dashboard = buildDashboard(entries);

    expect(dashboard.completedByType).toEqual({ movie: 1, tv: 0, book: 2 });
    expect(dashboard.completedByYear).toEqual([
      { year: 2026, movie: 0, tv: 0, book: 2, total: 2 },
      { year: 2025, movie: 1, tv: 0, book: 0, total: 1 },
    ]);
    expect(dashboard.recentlyCompleted[0]?.finishedAt).toBe('2026-04-01');
    expect(dashboard.inProgress).toHaveLength(1);
    expect(dashboard.planned).toHaveLength(1);
    expect(dashboard.onHold).toHaveLength(1);
    expect(dashboard.totals).toEqual({
      all: 6,
      completed: 3,
      inProgress: 1,
      onHold: 1,
      planned: 1,
    });
  });
});

describe('markLibraryEntries', () => {
  const results: NormalizedMedia[] = [
    { source: 'tmdb', externalId: '1', mediaType: 'movie', title: 'A', extra: {} },
    {
      source: 'google_books',
      externalId: 'g1',
      mediaType: 'book',
      title: 'B',
      isbn13: '9788845210662',
      extra: {},
    },
    { source: 'tmdb', externalId: '2', mediaType: 'movie', title: 'C', extra: {} },
  ];

  it('matches by source and id, and books by ISBN across sources', () => {
    const marked = markLibraryEntries(results, [
      { source: 'tmdb', externalId: '1', isbn13: null, mediaItemId: 'm1', status: 'completed' },
      {
        source: 'open_library',
        externalId: 'OL1W',
        isbn13: '9788845210662',
        mediaItemId: 'm2',
        status: 'planned',
      },
    ]);

    expect(marked.map((m) => m.library?.mediaItemId)).toEqual(['m1', 'm2', undefined]);
  });
});
