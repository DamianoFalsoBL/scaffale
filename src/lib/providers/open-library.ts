import { z } from 'zod';

import { fetchJson, parseItems, type FetchLike } from './http';
import { openLibraryCoverByIsbn, toIsbn13 } from './isbn';
import { EMPTY_PAGE, type MediaProvider, type NormalizedMedia, type SearchPage } from './types';

const API_BASE = 'https://openlibrary.org';
const COVERS_BASE = 'https://covers.openlibrary.org/b';
const PAGE_SIZE = 20;
const SEARCH_FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'first_publish_year',
  'cover_i',
  'isbn',
  'number_of_pages_median',
  'subject',
  'language',
].join(',');

// Open Library asks clients to identify themselves.
const HEADERS = { 'User-Agent': 'Scaffale (personal project)' };

const SEARCH_REVALIDATE = 600;
const DETAILS_REVALIDATE = 86_400;

export const openLibraryDocSchema = z.object({
  key: z.string().regex(/^\/works\/OL\d+W$/),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author_name: z.array(z.string()).optional(),
  first_publish_year: z.number().int().optional(),
  cover_i: z.number().int().positive().optional(),
  isbn: z.array(z.string()).optional(),
  number_of_pages_median: z.number().int().positive().optional(),
  subject: z.array(z.string()).optional(),
  language: z.array(z.string()).optional(),
});

const searchResponseSchema = z.object({
  numFound: z.number().int(),
  start: z.number().int(),
  docs: z.array(z.unknown()),
});

const workSchema = z.object({
  description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
});

export type OpenLibraryDoc = z.infer<typeof openLibraryDocSchema>;

export interface OpenLibraryBookExtra {
  authors: string[];
  subtitle?: string;
  pageCount?: number;
  languages: string[];
}

/** Picks an ISBN-13, preferring Italian editions (978-88 group). */
export function pickIsbn13(isbns: readonly string[] = []): string | undefined {
  const valid = isbns.map(toIsbn13).filter((isbn): isbn is string => !!isbn);
  return valid.find((isbn) => isbn.startsWith('97888')) ?? valid[0];
}

export function workIdFromKey(key: string) {
  return key.replace('/works/', '');
}

export function mapOpenLibraryDoc(doc: OpenLibraryDoc, overview?: string): NormalizedMedia {
  const isbn13 = pickIsbn13(doc.isbn);
  const posterUrl = doc.cover_i
    ? `${COVERS_BASE}/id/${doc.cover_i}-M.jpg`
    : isbn13
      ? openLibraryCoverByIsbn(isbn13)
      : undefined;

  const extra: OpenLibraryBookExtra = {
    authors: doc.author_name ?? [],
    subtitle: doc.subtitle,
    pageCount: doc.number_of_pages_median,
    languages: doc.language ?? [],
  };

  return {
    source: 'open_library',
    externalId: workIdFromKey(doc.key),
    mediaType: 'book',
    title: doc.title,
    year: doc.first_publish_year,
    posterUrl,
    overview,
    // Subjects are free-form tags; the first few are the most relevant.
    genres: doc.subject?.slice(0, 3) ?? [],
    isbn13,
    extra: { ...extra },
  };
}

export function createOpenLibraryProvider({ fetchImpl }: { fetchImpl?: FetchLike } = {}) {
  const request = <T>(path: string, schema: z.ZodType<T>, revalidate: number) =>
    fetchJson(`${API_BASE}${path}`, {
      source: 'open_library',
      schema,
      revalidate,
      headers: HEADERS,
      fetchImpl,
    });

  const provider: MediaProvider = {
    async search(query, { type, page = 1 } = {}): Promise<SearchPage> {
      if (type && type !== 'book') {
        return EMPTY_PAGE(page);
      }

      const params = new URLSearchParams({
        q: query,
        lang: 'it',
        limit: String(PAGE_SIZE),
        page: String(page),
        fields: SEARCH_FIELDS,
      });
      const data = await request(`/search.json?${params}`, searchResponseSchema, SEARCH_REVALIDATE);
      const docs = parseItems(data.docs, openLibraryDocSchema);

      return {
        results: docs.map((doc) => mapOpenLibraryDoc(doc)),
        page,
        hasMore: data.start + data.docs.length < data.numFound,
      };
    },

    async getDetails(externalId) {
      const params = new URLSearchParams({
        q: `key:"/works/${externalId}"`,
        fields: SEARCH_FIELDS,
      });
      const [data, work] = await Promise.all([
        request(`/search.json?${params}`, searchResponseSchema, DETAILS_REVALIDATE),
        request(`/works/${encodeURIComponent(externalId)}.json`, workSchema, DETAILS_REVALIDATE),
      ]);
      const [doc] = parseItems(data.docs, openLibraryDocSchema);

      if (!doc) {
        throw new Error(`Open Library work ${externalId} not found`);
      }

      const description =
        typeof work.description === 'string' ? work.description : work.description?.value;

      return mapOpenLibraryDoc(doc, description?.trim() || undefined);
    },
  };

  return provider;
}
