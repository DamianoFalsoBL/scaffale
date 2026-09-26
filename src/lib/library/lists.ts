import type { LibraryEntry } from './model';

export interface ListInfo {
  id: string;
  name: string;
  description: string | null;
}

export interface ListSummary extends ListInfo {
  count: number;
  /** A few posters of its titles, most recently added to the library first. */
  posters: Pick<LibraryEntry['item'], 'posterUrl' | 'mediaType' | 'title'>[];
}

const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });

export function sortLists<T extends ListInfo>(lists: readonly T[]): T[] {
  return [...lists].sort((a, b) => collator.compare(a.name, b.name));
}

/** Counts and cover posters from the library itself (entries already carry their list ids). */
export function summarizeLists(
  lists: readonly ListInfo[],
  entries: readonly LibraryEntry[],
  posterCount = 3,
): ListSummary[] {
  return sortLists(lists).map((list) => {
    const members = entries.filter((entry) => entry.listIds.includes(list.id));
    return {
      ...list,
      count: members.length,
      posters: members.slice(0, posterCount).map(({ item }) => ({
        posterUrl: item.posterUrl,
        mediaType: item.mediaType,
        title: item.title,
      })),
    };
  });
}
