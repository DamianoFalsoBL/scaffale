import { describe, expect, it } from 'vitest';

import { addEntrySchema, libraryHref, libraryParamsSchema, updateEntrySchema } from './library';

const entryId = '0b9f8f64-3c2f-4a36-9d51-8a8e3b0f6c11';

describe('addEntrySchema', () => {
  it('accepts a valid request and rejects unknown sources', () => {
    const valid = { source: 'tmdb', externalId: '438631', mediaType: 'movie', status: 'planned' };
    expect(addEntrySchema.safeParse(valid).success).toBe(true);
    expect(addEntrySchema.safeParse({ ...valid, source: 'imdb' }).success).toBe(false);
  });
});

describe('updateEntrySchema', () => {
  const form = {
    entryId,
    status: 'completed',
    rating: '7',
    startedAt: '2026-01-01',
    finishedAt: '2026-01-10',
    timesCompleted: '2',
    notes: '  bello  ',
  };

  it('coerces form values', () => {
    expect(updateEntrySchema.parse(form)).toEqual({
      entryId,
      status: 'completed',
      rating: 7,
      startedAt: '2026-01-01',
      finishedAt: '2026-01-10',
      timesCompleted: 2,
      notes: 'bello',
    });
  });

  it('turns empty fields into null', () => {
    const parsed = updateEntrySchema.parse({
      ...form,
      rating: '',
      startedAt: '',
      finishedAt: '',
      notes: ' ',
    });
    expect(parsed).toMatchObject({ rating: null, startedAt: null, finishedAt: null, notes: null });
  });

  it('rejects ratings outside 1–10 and an end date before the start', () => {
    expect(updateEntrySchema.safeParse({ ...form, rating: '11' }).success).toBe(false);
    const result = updateEntrySchema.safeParse({ ...form, finishedAt: '2025-12-31' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'La data di fine non può precedere quella di inizio.',
    );
  });
});

describe('libraryParamsSchema', () => {
  it('falls back to defaults for invalid values', () => {
    expect(
      libraryParamsSchema.parse({
        type: 'podcast',
        status: 'x',
        sort: 'y',
        view: 'z',
        list: 'not-a-uuid',
        provider: 'blockbuster',
      }),
    ).toEqual({
      type: 'all',
      status: 'all',
      sort: 'added',
      view: 'grid',
      q: '',
      list: '',
      provider: '',
    });
  });

  it('keeps valid values', () => {
    expect(
      libraryParamsSchema.parse({
        type: 'book',
        status: 'completed',
        sort: 'rating',
        view: 'list',
        q: 'eco',
        list: '0f8fad5b-d9cb-469f-a165-70867728950e',
        provider: 'netflix',
      }),
    ).toEqual({
      type: 'book',
      status: 'completed',
      sort: 'rating',
      view: 'list',
      q: 'eco',
      list: '0f8fad5b-d9cb-469f-a165-70867728950e',
      provider: 'netflix',
    });
  });
});

describe('libraryHref', () => {
  it('keeps only non-default values', () => {
    const params = libraryParamsSchema.parse({ type: 'tv', q: 'dark' });

    expect(libraryHref(params)).toBe('/library?type=tv&q=dark');
    expect(libraryHref(params, { list: '0f8fad5b-d9cb-469f-a165-70867728950e', q: '' })).toBe(
      '/library?type=tv&list=0f8fad5b-d9cb-469f-a165-70867728950e',
    );
    expect(libraryHref(libraryParamsSchema.parse({}))).toBe('/library');
    expect(libraryHref(params, { provider: 'prime' })).toBe(
      '/library?type=tv&q=dark&provider=prime',
    );
  });
});
