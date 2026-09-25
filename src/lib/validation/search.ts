import { z } from 'zod';

export const SEARCH_FILTERS = ['all', 'movie', 'tv', 'book'] as const;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  type: z.enum(SEARCH_FILTERS).catch('all'),
  page: z.coerce.number().int().min(1).max(20).catch(1),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
