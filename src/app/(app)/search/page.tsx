import type { Metadata } from 'next';

import { searchFiltersSchema } from '@/lib/search-filters';
import { SEARCH_FILTERS } from '@/lib/validation/search';

import { SearchView } from './search-view';

export const metadata: Metadata = {
  title: 'Cerca',
};

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const params = await searchParams;
  const { q, type } = params;
  const initialType = SEARCH_FILTERS.find((filter) => filter === type) ?? 'all';
  // Only the first value of repeated keys, like the API does.
  const initialFilters = searchFiltersSchema.parse(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cerca</h1>
      <SearchView
        initialQuery={typeof q === 'string' ? q : ''}
        initialType={initialType}
        initialFilters={initialFilters}
      />
    </div>
  );
}
