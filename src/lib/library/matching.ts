import type { NormalizedMedia, Source } from '@/lib/providers/types';
import type { EntryStatus } from '@/lib/status-labels';

export interface LibraryRef {
  mediaItemId: string;
  status: EntryStatus;
}

export interface LibraryIndexRow extends LibraryRef {
  source: Source;
  externalId: string;
  isbn13: string | null;
}

export type SearchResultWithLibrary = NormalizedMedia & { library?: LibraryRef };

/**
 * Marks search results that are already in the library: same source and id,
 * or (books) same ISBN-13 even when the library copy came from another source.
 */
export function markLibraryEntries(
  results: readonly NormalizedMedia[],
  rows: readonly LibraryIndexRow[],
): SearchResultWithLibrary[] {
  const byId = new Map(rows.map((row) => [`${row.source}:${row.externalId}`, row]));
  const byIsbn = new Map(rows.flatMap((row) => (row.isbn13 ? [[row.isbn13, row] as const] : [])));

  return results.map((media) => {
    const row =
      byId.get(`${media.source}:${media.externalId}`) ??
      (media.isbn13 ? byIsbn.get(media.isbn13) : undefined);

    return row
      ? { ...media, library: { mediaItemId: row.mediaItemId, status: row.status } }
      : media;
  });
}
