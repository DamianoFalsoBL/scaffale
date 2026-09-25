import { describe, expect, it, vi } from 'vitest';

import searchFixture from '../../../tests/fixtures/open-library/search.json';
import workFixture from '../../../tests/fixtures/open-library/work.json';
import type { FetchLike } from './http';
import {
  createOpenLibraryProvider,
  mapOpenLibraryDoc,
  openLibraryDocSchema,
  pickIsbn13,
} from './open-library';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('mapOpenLibraryDoc', () => {
  const doc = openLibraryDocSchema.parse(searchFixture.docs[0]);

  it('normalizes a work', () => {
    const media = mapOpenLibraryDoc(doc);

    expect(media).toMatchObject({
      source: 'open_library',
      externalId: 'OL8996439W',
      mediaType: 'book',
      title: 'Il nome della rosa',
      year: 1980,
      posterUrl: 'https://covers.openlibrary.org/b/id/8598263-M.jpg',
      extra: { authors: ['Umberto Eco'], pageCount: 533 },
    });
    expect(media.genres).toHaveLength(3);
  });

  it('falls back to an ISBN cover when there is no cover id', () => {
    const media = mapOpenLibraryDoc({ ...doc, cover_i: undefined, isbn: ['8845207056'] });

    expect(media.posterUrl).toBe(
      'https://covers.openlibrary.org/b/isbn/9788845207051-M.jpg?default=false',
    );
  });
});

describe('pickIsbn13', () => {
  it('prefers Italian ISBNs and converts ISBN-10', () => {
    expect(pickIsbn13(['9780330284783', '9788845210662'])).toBe('9788845210662');
    expect(pickIsbn13(['0306406152'])).toBe('9780306406157');
    expect(pickIsbn13([])).toBeUndefined();
  });
});

describe('createOpenLibraryProvider', () => {
  it('searches in Italian and skips malformed docs', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      json({ ...searchFixture, docs: [...searchFixture.docs, { key: 'bad' }] }),
    );
    const provider = createOpenLibraryProvider({ fetchImpl });

    const page = await provider.search('il nome della rosa');
    const url = new URL(fetchImpl.mock.calls[0]![0]);

    expect(url.pathname).toBe('/search.json');
    expect(url.searchParams.get('lang')).toBe('it');
    expect(page.results).toHaveLength(searchFixture.docs.length);
    expect(page.hasMore).toBe(true);
  });

  it('returns nothing for non-book searches without calling the API', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const provider = createOpenLibraryProvider({ fetchImpl });

    await expect(provider.search('dune', { type: 'movie' })).resolves.toMatchObject({
      results: [],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('gets details with the work description', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) =>
      json(
        input.includes('/works/')
          ? workFixture
          : { ...searchFixture, docs: [searchFixture.docs[0]] },
      ),
    );
    const provider = createOpenLibraryProvider({ fetchImpl });

    const media = await provider.getDetails('OL8996439W', 'book');

    expect(media.title).toBe('Il nome della rosa');
    expect(media.overview).toContain('1327');
  });
});
