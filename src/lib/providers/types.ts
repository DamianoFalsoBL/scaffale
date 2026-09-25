import type { Enums } from '@/lib/supabase/database.types';

export type MediaType = Enums<'media_type'>;
export type Source = Enums<'media_source'>;

export interface NormalizedMedia {
  source: Source;
  externalId: string;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  posterUrl?: string;
  overview?: string;
  genres?: string[];
  isbn13?: string;
  // runtime, number_of_seasons, authors, page_count…: see the provider for the exact shape.
  extra: Record<string, unknown>;
}

export interface SearchOptions {
  type?: MediaType;
  page?: number;
}

export interface SearchPage {
  results: NormalizedMedia[];
  page: number;
  hasMore: boolean;
}

export interface MediaProvider {
  search(query: string, opts?: SearchOptions): Promise<SearchPage>;
  getDetails(externalId: string, type: MediaType): Promise<NormalizedMedia>;
}

export const EMPTY_PAGE = (page: number): SearchPage => ({ results: [], page, hasMore: false });
