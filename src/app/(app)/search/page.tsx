import type { Metadata } from 'next';

import { SEARCH_FILTERS } from '@/lib/validation/search';

import { SearchView } from './search-view';

export const metadata: Metadata = {
  title: 'Cerca',
};

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const { q, type } = await searchParams;
  const initialType = SEARCH_FILTERS.find((filter) => filter === type) ?? 'all';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cerca</h1>
      <SearchView initialQuery={typeof q === 'string' ? q : ''} initialType={initialType} />
    </div>
  );
}
