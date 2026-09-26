import { z } from 'zod';

import { searchFiltersSchema } from '@/lib/search-filters';

export const SEARCH_FILTERS = ['all', 'movie', 'tv', 'book', 'person'] as const;

export const MIN_QUERY_LENGTH = 2;

/** An empty query means Esplora (titles by filters); people always need a name. */
export const searchQuerySchema = z
  .object({
    q: z.string().trim().max(100).default(''),
    type: z.enum(SEARCH_FILTERS).catch('all'),
    page: z.coerce.number().int().min(1).max(20).catch(1),
  })
  .extend(searchFiltersSchema.shape)
  .refine(({ q }) => q === '' || q.length >= MIN_QUERY_LENGTH, { path: ['q'] })
  .refine(({ q, type }) => type !== 'person' || q.length >= MIN_QUERY_LENGTH, { path: ['q'] });

export type SearchQuery = z.infer<typeof searchQuerySchema>;
