import { describe, expect, it, vi } from 'vitest';

import { ProviderError } from './http';
import { interleave, searchMedia, SearchUnavailableError } from './search';
import type { MediaProvider, NormalizedMedia, SearchPage } from './types';

function media(source: NormalizedMedia['source'], id: string): NormalizedMedia {
  return {
    source,
    externalId: id,
    mediaType: source === 'tmdb' ? 'movie' : 'book',
    title: id,
    extra: {},
  };
}

function provider(
  result: SearchPage | Error,
): MediaProvider & { search: ReturnType<typeof vi.fn> } {
  return {
    search: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
    getDetails: vi.fn(),
  };
}

const page = (results: NormalizedMedia[], hasMore = false): SearchPage => ({
  results,
  page: 1,
  hasMore,
});

describe('interleave', () => {
  it('alternates and appends the rest', () => {
    expect(interleave(['a1', 'a2', 'a3'], ['b1'])).toEqual(['a1', 'b1', 'a2', 'a3']);
    expect(interleave([], ['b1', 'b2'])).toEqual(['b1', 'b2']);
  });
});

describe('searchMedia', () => {
  const query = { query: 'dune', page: 1 };

  it('mixes screen and book results for "all"', async () => {
    const deps = {
      tmdb: provider(page([media('tmdb', 'm1'), media('tmdb', 'm2')], true)),
      google: provider(page([media('google_books', 'b1')])),
      openLibrary: provider(page([])),
    };

    const result = await searchMedia({ ...query, type: 'all' }, deps);

    expect(result.results.map((m) => m.externalId)).toEqual(['m1', 'b1', 'm2']);
    expect(result.hasMore).toBe(true);
    expect(result.unavailable).toEqual([]);
    expect(deps.tmdb.search).toHaveBeenCalledWith('dune', { type: undefined, page: 1 });
    expect(deps.openLibrary.search).not.toHaveBeenCalled();
  });

  it('only queries TMDB for movies and tv', async () => {
    const deps = {
      tmdb: provider(page([media('tmdb', 'm1')])),
      google: provider(page([])),
      openLibrary: provider(page([])),
    };

    await searchMedia({ ...query, type: 'tv' }, deps);

    expect(deps.tmdb.search).toHaveBeenCalledWith('dune', { type: 'tv', page: 1 });
    expect(deps.google.search).not.toHaveBeenCalled();
  });

  it('falls back to Open Library when Google Books is over quota', async () => {
    const onBookFallback = vi.fn();
    const deps = {
      google: provider(new ProviderError('quota', 'google_books', 429)),
      openLibrary: provider(page([media('open_library', 'OL1W')])),
      onBookFallback,
    };

    const result = await searchMedia({ ...query, type: 'book' }, deps);

    expect(result.results.map((m) => m.source)).toEqual(['open_library']);
    expect(onBookFallback).toHaveBeenCalledWith(expect.any(ProviderError));
  });

  it('falls back to Open Library when Google Books finds nothing or is not configured', async () => {
    const openLibrary = provider(page([media('open_library', 'OL1W')]));

    await searchMedia({ ...query, type: 'book' }, { google: provider(page([])), openLibrary });
    await searchMedia({ ...query, type: 'book' }, { openLibrary });

    expect(openLibrary.search).toHaveBeenCalledTimes(2);
  });

  it('returns partial results when one group fails', async () => {
    const deps = {
      tmdb: provider(new ProviderError('down', 'tmdb', 503)),
      google: provider(page([media('google_books', 'b1')])),
      openLibrary: provider(page([])),
    };

    const result = await searchMedia({ ...query, type: 'all' }, deps);

    expect(result.results).toHaveLength(1);
    expect(result.unavailable).toEqual(['screen']);
  });

  it('throws when every requested group fails', async () => {
    const deps = {
      openLibrary: provider(new ProviderError('down', 'open_library', 503)),
    };

    await expect(searchMedia({ ...query, type: 'movie' }, deps)).rejects.toBeInstanceOf(
      SearchUnavailableError,
    );
    await expect(searchMedia({ ...query, type: 'all' }, deps)).rejects.toBeInstanceOf(
      SearchUnavailableError,
    );
  });

  it('searches only people for the "person" filter', async () => {
    const people = vi.fn(async () => ({
      people: [{ id: 1, name: 'Denis Villeneuve', knownFor: [] }],
      page: 1,
      hasMore: true,
    }));
    const tmdb = provider(page([]));

    const result = await searchMedia(
      { ...query, type: 'person' },
      { tmdb, openLibrary: provider(page([])), people },
    );

    expect(result).toMatchObject({
      results: [],
      people: [{ name: 'Denis Villeneuve' }],
      hasMore: true,
    });
    expect(tmdb.search).not.toHaveBeenCalled();
  });

  it('adds a short people preview to "all" on the first page, ignoring its failures', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `P${i}`, knownFor: [] }));
    const deps = {
      tmdb: provider(page([media('tmdb', 'm1')])),
      google: provider(page([])),
      openLibrary: provider(page([])),
      people: vi.fn(async () => ({ people: many, page: 1, hasMore: false })),
    };

    expect((await searchMedia({ ...query, type: 'all' }, deps)).people).toHaveLength(6);
    expect((await searchMedia({ ...query, type: 'all', page: 2 }, deps)).people).toEqual([]);

    deps.people.mockRejectedValueOnce(new Error('down'));
    const result = await searchMedia({ ...query, type: 'all' }, deps);
    expect(result.people).toEqual([]);
    expect(result.results).toHaveLength(1);
  });
});
