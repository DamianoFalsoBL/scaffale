import type { MediaType } from '@/lib/providers/types';
import type { SEARCH_FILTERS } from '@/lib/validation/search';

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Film',
  tv: 'Serie TV',
  book: 'Libro',
};

export const SEARCH_FILTER_LABELS: Record<(typeof SEARCH_FILTERS)[number], string> = {
  all: 'Tutti',
  movie: 'Film',
  tv: 'Serie',
  book: 'Libri',
  person: 'Persone',
};
