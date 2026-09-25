import { describe, expect, it, vi } from 'vitest';

import searchIt from '../../../tests/fixtures/google-books/search-it.json';
import searchAll from '../../../tests/fixtures/google-books/search.json';
import volume from '../../../tests/fixtures/google-books/volume.json';
import {
  createGoogleBooksProvider,
  googleVolumeSchema,
  mapGoogleVolume,
  mergeBookResults,
  normalizeThumbnail,
  stripHtml,
} from './google-books';
import type { FetchLike } from './http';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const firstItem = googleVolumeSchema.parse(searchIt.items[0]);

describe('mapGoogleVolume', () => {
  it('normalizes a volume', () => {
    expect(mapGoogleVolume(firstItem)).toMatchObject({
      source: 'google_books',
      externalId: 'UXGREQAAQBAJ',
      mediaType: 'book',
      year: 2025,
      isbn13: '9788834622377',
      extra: { authors: ['AA.VV'], language: 'it' },
    });
  });

  it('forces https and drops the page curl on thumbnails', () => {
    const { posterUrl } = mapGoogleVolume(firstItem);

    expect(posterUrl).toMatch(/^https:\/\/books\.google\.com\//);
    expect(posterUrl).not.toContain('edge=curl');
    expect(normalizeThumbnail(undefined)).toBeUndefined();
  });

  it('uses an Open Library cover when the thumbnail is missing', () => {
    const media = mapGoogleVolume({
      ...firstItem,
      volumeInfo: { ...firstItem.volumeInfo, imageLinks: undefined },
    });

    expect(media.posterUrl).toBe(
      'https://covers.openlibrary.org/b/isbn/9788834622377-M.jpg?default=false',
    );
  });

  it('ignores non-ISBN identifiers', () => {
    const noIsbn = googleVolumeSchema.parse(searchIt.items[2]);

    expect(mapGoogleVolume(noIsbn).isbn13).toBeUndefined();
  });

  it('strips HTML from detail descriptions', () => {
    const media = mapGoogleVolume(googleVolumeSchema.parse(volume));

    expect(volume.volumeInfo.description).toContain('<i>');
    expect(media.overview).not.toMatch(/<[^>]+>/);
    expect(stripHtml('a<br>b &amp; c')).toBe('a\nb & c');
  });
});

describe('mergeBookResults', () => {
  it('keeps Italian results first and removes duplicates by id or ISBN', () => {
    const italian = searchIt.items.map((item) => mapGoogleVolume(googleVolumeSchema.parse(item)));
    const all = searchAll.items.map((item) => mapGoogleVolume(googleVolumeSchema.parse(item)));
    const sameIsbnOtherId = { ...all[1]!, externalId: 'another-edition' };

    const merged = mergeBookResults(italian, [...all, sameIsbnOtherId]);

    expect(merged.map((m) => m.externalId)).toEqual(italian.map((m) => m.externalId));
  });
});

describe('createGoogleBooksProvider', () => {
  it('runs an Italian and an unrestricted search in parallel', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) =>
      json(new URL(input).searchParams.get('langRestrict') === 'it' ? searchIt : searchAll),
    );
    const provider = createGoogleBooksProvider({ apiKey: 'key', fetchImpl });

    const page = await provider.search('il nome della rosa', { page: 2 });
    const urls = fetchImpl.mock.calls.map(([input]) => new URL(input));

    expect(urls).toHaveLength(2);
    expect(urls.every((url) => url.searchParams.get('startIndex') === '20')).toBe(true);
    expect(urls.every((url) => url.searchParams.get('key') === 'key')).toBe(true);
    expect(page.results.length).toBeGreaterThan(0);
    expect(page.hasMore).toBe(true);
  });

  it('tolerates pages without items', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json({ totalItems: 0 }));
    const provider = createGoogleBooksProvider({ apiKey: 'key', fetchImpl });

    await expect(provider.search('zzzzzz')).resolves.toMatchObject({
      results: [],
      hasMore: false,
    });
  });

  it('gets volume details', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json(volume));
    const provider = createGoogleBooksProvider({ apiKey: 'key', fetchImpl });

    const media = await provider.getDetails('UXGREQAAQBAJ', 'book');

    expect(new URL(fetchImpl.mock.calls[0]![0]).pathname).toBe('/books/v1/volumes/UXGREQAAQBAJ');
    expect(media.extra).toMatchObject({ pageCount: 320 });
  });
});
