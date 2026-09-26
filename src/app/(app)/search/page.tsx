import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchView } from './search-view';

export const metadata: Metadata = {
  title: 'Cerca',
};

// SearchView reads query, type and filters from the URL itself (useSearchParams).
export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cerca</h1>
      <Suspense>
        <SearchView />
      </Suspense>
    </div>
  );
}
