import type { LibraryEntry } from '@/lib/library/model';
import type { MediaType, NormalizedMedia, Source } from '@/lib/providers/types';
import type { EntryStatus } from '@/lib/status-labels';

export interface LibraryRef {
  mediaItemId: string;
  status: EntryStatus;
}

export interface LibraryIndexRow extends LibraryRef {
  source: Source;
  mediaType: MediaType;
  externalId: string;
  isbn13: string | null;
}

export type SearchResultWithLibrary = NormalizedMedia & { library?: LibraryRef };

/**
 * Marks search results that are already in the library: same source, type and id
 * (TMDB movies and series share the id space),
 * or (books) same ISBN-13 even when the library copy came from another source.
 */
export function markLibraryEntries(
  results: readonly NormalizedMedia[],
  rows: readonly LibraryIndexRow[],
): SearchResultWithLibrary[] {
  const byId = new Map(
    rows.map((row) => [`${row.source}:${row.mediaType}:${row.externalId}`, row]),
  );
  const byIsbn = new Map(rows.flatMap((row) => (row.isbn13 ? [[row.isbn13, row] as const] : [])));

  return results.map((media) => {
    const row =
      byId.get(`${media.source}:${media.mediaType}:${media.externalId}`) ??
      (media.isbn13 ? byIsbn.get(media.isbn13) : undefined);

    return row
      ? { ...media, library: { mediaItemId: row.mediaItemId, status: row.status } }
      : media;
  });
}

/** The same index built from full library entries, when a page loads them anyway. */
export function libraryIndexOf(entries: readonly LibraryEntry[]): LibraryIndexRow[] {
  return entries.map((entry) => ({
    mediaItemId: entry.item.id,
    status: entry.status,
    source: entry.item.source,
    mediaType: entry.item.mediaType,
    externalId: entry.item.externalId,
    isbn13: entry.item.isbn13,
  }));
}
