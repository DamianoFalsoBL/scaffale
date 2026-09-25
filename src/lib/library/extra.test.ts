import { describe, expect, it } from 'vitest';

import { formatRuntime, parseExtra, tvStatusLabel } from './extra';

describe('parseExtra', () => {
  it('parses provider snapshots by media type', () => {
    expect(parseExtra('movie', { runtime: 155, tagline: 'x' })).toEqual({
      mediaType: 'movie',
      extra: { runtime: 155, tagline: 'x' },
    });
    expect(parseExtra('book', { authors: ['Umberto Eco'], pageCount: 533 }).extra).toMatchObject({
      authors: ['Umberto Eco'],
      pageCount: 533,
    });
  });

  it('tolerates missing or malformed fields', () => {
    expect(parseExtra('tv', { seasons: 'nope', numberOfSeasons: 'two' }).extra).toEqual({
      seasons: [],
      numberOfSeasons: undefined,
      numberOfEpisodes: undefined,
      episodeRuntime: undefined,
      status: undefined,
    });
    expect(parseExtra('book', {}).extra).toMatchObject({ authors: [] });
  });
});

describe('formatting helpers', () => {
  it('formats runtimes and TMDB series statuses', () => {
    expect(formatRuntime(155)).toBe('2 h 35 min');
    expect(formatRuntime(45)).toBe('45 min');
    expect(formatRuntime(undefined)).toBeUndefined();
    expect(tvStatusLabel('Returning Series')).toBe('In corso');
    expect(tvStatusLabel('Something new')).toBe('Something new');
  });
});
