import { z } from 'zod';

import { fetchJson, nonEmpty, parseItems, yearFromDate, type FetchLike } from './http';
import { openLibraryCoverByIsbn, toIsbn13 } from './isbn';
import { EMPTY_PAGE, type MediaProvider, type NormalizedMedia, type SearchPage } from './types';

const API_BASE = 'https://www.googleapis.com/books/v1';
const PAGE_SIZE = 20;
const VOLUME_INFO_FIELDS =
  'title,subtitle,authors,publisher,publishedDate,description,industryIdentifiers,pageCount,categories,imageLinks,language';

const SEARCH_REVALIDATE = 600;
const DETAILS_REVALIDATE = 86_400;

export const googleVolumeSchema = z.object({
  id: z.string().min(1),
  volumeInfo: z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
    description: z.string().optional(),
    industryIdentifiers: z.array(z.object({ type: z.string(), identifier: z.string() })).optional(),
    pageCount: z.number().int().optional(),
    categories: z.array(z.string()).optional(),
    imageLinks: z.record(z.string(), z.string()).optional(),
    language: z.string().optional(),
  }),
});

const volumesResponseSchema = z.object({
  totalItems: z.number().int(),
  items: z.array(z.unknown()).optional(),
});

export type GoogleVolume = z.infer<typeof googleVolumeSchema>;

export interface GoogleBookExtra {
  authors: string[];
  subtitle?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
}

/** Thumbnails sometimes come as http and with a page-curl effect: force https, drop the curl. */
export function normalizeThumbnail(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  const normalized = new URL(url.replace(/^http:\/\//, 'https://'));
  normalized.searchParams.delete('edge');
  return normalized.toString();
}

/** Book descriptions from the details endpoint contain HTML. */
export function stripHtml(text: string | undefined): string | undefined {
  return nonEmpty(
    text
      ?.replace(/<br\s*\/?>|<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n'),
  );
}

export function extractIsbn13(identifiers: GoogleVolume['volumeInfo']['industryIdentifiers']) {
  const byType = (type: string) => identifiers?.find((id) => id.type === type)?.identifier;
  return toIsbn13(byType('ISBN_13')) ?? toIsbn13(byType('ISBN_10'));
}

export function mapGoogleVolume(volume: GoogleVolume): NormalizedMedia {
  const info = volume.volumeInfo;
  const isbn13 = extractIsbn13(info.industryIdentifiers);
  const thumbnail = normalizeThumbnail(
    info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail,
  );

  const extra: GoogleBookExtra = {
    authors: info.authors ?? [],
    subtitle: nonEmpty(info.subtitle),
    publisher: nonEmpty(info.publisher),
    pageCount: info.pageCount && info.pageCount > 0 ? info.pageCount : undefined,
    language: info.language,
  };

  return {
    source: 'google_books',
    externalId: volume.id,
    mediaType: 'book',
    title: info.title,
    year: yearFromDate(info.publishedDate),
    posterUrl: thumbnail ?? (isbn13 ? openLibraryCoverByIsbn(isbn13) : undefined),
    overview: stripHtml(info.description),
    genres: info.categories ?? [],
    isbn13,
    extra: { ...extra },
  };
}

/** Italian results first, then the rest, without duplicates (same volume or same ISBN). */
export function mergeBookResults(
  italian: readonly NormalizedMedia[],
  others: readonly NormalizedMedia[],
): NormalizedMedia[] {
  const seenIds = new Set<string>();
  const seenIsbns = new Set<string>();

  return [...italian, ...others].filter((media) => {
    if (seenIds.has(media.externalId) || (media.isbn13 && seenIsbns.has(media.isbn13))) {
      return false;
    }
    seenIds.add(media.externalId);
    if (media.isbn13) {
      seenIsbns.add(media.isbn13);
    }
    return true;
  });
}

export function createGoogleBooksProvider({
  apiKey,
  fetchImpl,
}: {
  apiKey: string;
  fetchImpl?: FetchLike;
}) {
  const request = <T>(
    path: string,
    params: URLSearchParams,
    schema: z.ZodType<T>,
    revalidate: number,
  ) => {
    params.set('key', apiKey);
    return fetchJson(`${API_BASE}${path}?${params}`, {
      source: 'google_books',
      schema,
      revalidate,
      fetchImpl,
    });
  };

  async function searchVolumes(query: string, page: number, langRestrict?: string) {
    const params = new URLSearchParams({
      q: query,
      printType: 'books',
      maxResults: String(PAGE_SIZE),
      startIndex: String((page - 1) * PAGE_SIZE),
      fields: `totalItems,items(id,volumeInfo(${VOLUME_INFO_FIELDS}))`,
    });
    if (langRestrict) {
      params.set('langRestrict', langRestrict);
    }

    const data = await request('/volumes', params, volumesResponseSchema, SEARCH_REVALIDATE);
    return {
      totalItems: data.totalItems,
      results: parseItems(data.items ?? [], googleVolumeSchema).map(mapGoogleVolume),
    };
  }

  const provider: MediaProvider = {
    async search(query, { type, page = 1 } = {}): Promise<SearchPage> {
      if (type && type !== 'book') {
        return EMPTY_PAGE(page);
      }

      // Italian editions first, without excluding the others.
      const [italian, all] = await Promise.all([
        searchVolumes(query, page, 'it'),
        searchVolumes(query, page),
      ]);
      const total = Math.max(italian.totalItems, all.totalItems);

      return {
        results: mergeBookResults(italian.results, all.results),
        page,
        hasMore: page * PAGE_SIZE < total,
      };
    },

    async getDetails(externalId) {
      const params = new URLSearchParams({ fields: `id,volumeInfo(${VOLUME_INFO_FIELDS})` });
      const volume = await request(
        `/volumes/${encodeURIComponent(externalId)}`,
        params,
        googleVolumeSchema,
        DETAILS_REVALIDATE,
      );
      return mapGoogleVolume(volume);
    },
  };

  return provider;
}
