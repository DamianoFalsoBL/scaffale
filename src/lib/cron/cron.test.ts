import { describe, expect, it, vi } from 'vitest';

import type { NormalizedMedia } from '@/lib/providers/types';

import { isAuthorizedCron } from './auth';
import { refreshStaleItems, staleCutoff, type StaleItem } from './refresh';

describe('isAuthorizedCron', () => {
  it('accepts only the exact bearer secret', () => {
    expect(isAuthorizedCron('Bearer s3cret-value-123456', 's3cret-value-123456')).toBe(true);
    expect(isAuthorizedCron('Bearer wrong', 's3cret-value-123456')).toBe(false);
    expect(isAuthorizedCron('s3cret-value-123456', 's3cret-value-123456')).toBe(false);
    expect(isAuthorizedCron(null, 's3cret-value-123456')).toBe(false);
  });

  it('rejects everything when no secret is configured', () => {
    expect(isAuthorizedCron('Bearer ', undefined)).toBe(false);
    expect(isAuthorizedCron('Bearer undefined', undefined)).toBe(false);
  });
});

describe('staleCutoff', () => {
  it('is 150 days before now', () => {
    expect(staleCutoff(new Date('2026-09-26T00:00:00Z'))).toBe('2026-04-29T00:00:00.000Z');
  });
});

describe('refreshStaleItems', () => {
  const items: StaleItem[] = [
    { id: 'a', source: 'tmdb', externalId: '1', mediaType: 'movie' },
    { id: 'b', source: 'google_books', externalId: 'x', mediaType: 'book' },
    { id: 'c', source: 'tmdb', externalId: '3', mediaType: 'tv' },
  ];
  const media = (item: StaleItem): NormalizedMedia => ({
    source: item.source,
    externalId: item.externalId,
    mediaType: item.mediaType,
    title: `T${item.id}`,
    extra: {},
  });

  it('refreshes items one by one, skipping failures', async () => {
    const save = vi.fn<(id: string, media: NormalizedMedia) => Promise<void>>(async () => {});
    const sleep = vi.fn(async () => {});
    const loadStale = vi.fn(async () => items);

    const summary = await refreshStaleItems(
      {
        loadStale,
        fetchDetails: async (item) => {
          if (item.id === 'b') throw new Error('google_books responded 503');
          return media(item);
        },
        save,
        sleep,
      },
      { now: new Date('2026-09-26T00:00:00Z'), limit: 10, delayMs: 100 },
    );

    expect(loadStale).toHaveBeenCalledWith('2026-04-29T00:00:00.000Z', 10);
    expect(save.mock.calls.map(([id]) => id)).toEqual(['a', 'c']);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({
      checked: 3,
      refreshed: 2,
      failed: [
        { id: 'b', source: 'google_books', externalId: 'x', error: 'google_books responded 503' },
      ],
    });
  });

  it('fills the batch with running series due for their weekly check', async () => {
    const item = (id: string): StaleItem => ({
      id,
      source: 'tmdb',
      externalId: id,
      mediaType: 'tv',
    });
    const loadRunningSeries = vi.fn(async () => [item('a'), item('s1'), item('s2')]);
    const save = vi.fn<(id: string, media: NormalizedMedia) => Promise<void>>(async () => {});

    const summary = await refreshStaleItems(
      {
        loadStale: async () => [item('a')],
        loadRunningSeries,
        fetchDetails: async (stale) => media(stale),
        save,
        sleep: async () => {},
      },
      { now: new Date('2026-09-26T00:00:00Z'), limit: 2 },
    );

    expect(loadRunningSeries).toHaveBeenCalledWith('2026-09-19T00:00:00.000Z', 2);
    // Deduplicated and capped at the batch size.
    expect(save.mock.calls.map(([id]) => id)).toEqual(['a', 's1']);
    expect(summary.refreshed).toBe(2);
  });

  it('does nothing when the catalog is fresh', async () => {
    const summary = await refreshStaleItems({
      loadStale: async () => [],
      fetchDetails: vi.fn(),
      save: vi.fn(),
    });

    expect(summary).toEqual({ checked: 0, refreshed: 0, failed: [] });
  });
});
