import { describe, expect, it } from 'vitest';

import type { LibraryEntry } from './model';
import {
  hasNewSeason,
  seasonNote,
  seasonsUpTo,
  statusAfterWatching,
  summarizeSeasons,
  waitingNote,
} from './seasons';

const today = '2026-09-26';
const extra = {
  seasons: [
    { seasonNumber: 0, episodeCount: 3, name: 'Speciali', airDate: '2018-12-01' },
    { seasonNumber: 2, episodeCount: 8, name: 'Stagione 2', airDate: '2021-03-01' },
    { seasonNumber: 1, episodeCount: 10, name: 'Stagione 1', airDate: '2019-03-01' },
    { seasonNumber: 3, episodeCount: 8, name: 'Stagione 3', airDate: '2027-01-15' },
    { seasonNumber: 4, episodeCount: 0, name: 'Stagione 4' },
  ],
};

describe('summarizeSeasons', () => {
  it('counts only aired regular seasons, in order', () => {
    const summary = summarizeSeasons(extra, [1], today);

    expect(summary.seasons.map((s) => [s.number, s.aired])).toEqual([
      [1, true],
      [2, true],
      [3, false],
      [4, false],
    ]);
    expect(summary).toMatchObject({ total: 2, watched: 1, next: 2, allWatched: false });
  });

  it('is all watched when every aired season is seen', () => {
    expect(summarizeSeasons(extra, [1, 2], today)).toMatchObject({
      watched: 2,
      next: null,
      allWatched: true,
    });
    expect(summarizeSeasons({ seasons: [] }, [], today).allWatched).toBe(false);
  });

  it('marks every aired season up to the chosen one', () => {
    expect(seasonsUpTo(summarizeSeasons(extra, [], today), 2)).toEqual([1, 2]);
    expect(seasonsUpTo(summarizeSeasons(extra, [], today), 4)).toEqual([1, 2]);
  });
});

describe('statusAfterWatching', () => {
  it('starts a planned, waiting or dropped series', () => {
    for (const status of ['planned', 'waiting', 'dropped'] as const) {
      expect(statusAfterWatching(status, { watched: 1, allWatched: false }, 'Ended')).toBe(
        'in_progress',
      );
    }
  });

  it('completes a finished series only when every season is seen', () => {
    expect(statusAfterWatching('in_progress', { watched: 2, allWatched: true }, 'Ended')).toBe(
      'completed',
    );
    expect(statusAfterWatching('in_progress', { watched: 2, allWatched: true }, 'Canceled')).toBe(
      'completed',
    );
    // Still running: waits for the next season.
    expect(
      statusAfterWatching('in_progress', { watched: 2, allWatched: true }, 'Returning Series'),
    ).toBe('waiting');
    expect(statusAfterWatching('planned', { watched: 2, allWatched: true }, undefined)).toBe(
      'waiting',
    );
  });

  it('keeps a completed series completed', () => {
    expect(
      statusAfterWatching('completed', { watched: 1, allWatched: false }, 'Returning Series'),
    ).toBe('completed');
  });
});

describe('seasonNote', () => {
  it('shows where the user is, or a new season for a finished one', () => {
    expect(seasonNote('in_progress', summarizeSeasons(extra, [1], today))).toBe('Stagione 2 di 2');
    expect(seasonNote('completed', summarizeSeasons(extra, [1], today))).toBe('Nuova stagione');
    expect(seasonNote('completed', summarizeSeasons(extra, [1, 2], today))).toBeUndefined();
    expect(seasonNote('planned', summarizeSeasons(extra, [], today))).toBeUndefined();
  });

  it('says what a waiting series waits for', () => {
    expect(seasonNote('waiting', summarizeSeasons(extra, [1], today))).toBe(
      'Stagione 2 disponibile',
    );
    expect(waitingNote(summarizeSeasons(extra, [1, 2], today))).toBe('Stagione 3 dal 15 gen 2027');
    const undated = { seasons: extra.seasons.filter((s) => s.seasonNumber !== 3) };
    expect(waitingNote(summarizeSeasons(undated, [1, 2], today))).toBe('Stagione 4 annunciata');
    const nothingNew = { seasons: extra.seasons.filter((s) => s.seasonNumber <= 2) };
    expect(waitingNote(summarizeSeasons(nothingNew, [1, 2], today))).toBe(
      'In attesa di una nuova stagione',
    );
  });
});

describe('hasNewSeason', () => {
  const series = (watchedSeasons: number[], mediaType: 'tv' | 'movie' = 'tv') =>
    ({ watchedSeasons, item: { mediaType, extra } }) as unknown as LibraryEntry;

  it('is true when an aired season is not seen yet', () => {
    expect(hasNewSeason(series([1]), today)).toBe(true);
    expect(hasNewSeason(series([1, 2]), today)).toBe(false);
    expect(hasNewSeason(series([], 'movie'), today)).toBe(false);
  });
});
