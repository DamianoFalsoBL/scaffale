import { describe, expect, it } from 'vitest';

import { summarizeLists } from './lists';
import type { LibraryEntry } from './model';

const entry = (id: string, listIds: string[]) =>
  ({
    id,
    listIds,
    item: { posterUrl: `/${id}.jpg`, mediaType: 'movie', title: id },
  }) as unknown as LibraryEntry;

describe('summarizeLists', () => {
  it('sorts by name and counts members from the library', () => {
    const lists = [
      { id: 'b', name: 'zombie', description: null },
      { id: 'a', name: 'Anna', description: 'Da vedere insieme' },
    ];
    const entries = [entry('e1', ['a']), entry('e2', ['a', 'b']), entry('e3', [])];

    const summary = summarizeLists(lists, entries, 1);

    expect(summary.map((list) => [list.name, list.count])).toEqual([
      ['Anna', 2],
      ['zombie', 1],
    ]);
    expect(summary[0]?.posters).toEqual([
      { posterUrl: '/e1.jpg', mediaType: 'movie', title: 'e1' },
    ]);
  });
});
