import { afterEach, describe, expect, it, vi } from 'vitest';

import { lastSearchHref, rememberSearch } from './search-memory';

describe('search memory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reopens the last search', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });

    expect(lastSearchHref()).toBe('/search');
    rememberSearch('q=dune&type=book');
    expect(lastSearchHref()).toBe('/search?q=dune&type=book');
    rememberSearch('');
    expect(lastSearchHref()).toBe('/search');
  });

  it('falls back to an empty search without storage', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(() => rememberSearch('q=dune')).not.toThrow();
    expect(lastSearchHref()).toBe('/search');
  });
});
