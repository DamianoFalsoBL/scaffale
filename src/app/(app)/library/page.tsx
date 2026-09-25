import { Library, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EntryGrid, EntryList } from '@/components/library-views';
import { Button } from '@/components/ui/button';
import { getLibrary } from '@/lib/library/queries';
import { filterEntries, sortEntries } from '@/lib/library/views';
import { libraryParamsSchema } from '@/lib/validation/library';

import { LibraryToolbar } from './library-toolbar';

export const metadata: Metadata = {
  title: 'Libreria',
};

export default async function LibraryPage({ searchParams }: PageProps<'/library'>) {
  const params = libraryParamsSchema.parse(await searchParams);
  const entries = await getLibrary();

  // Counts per tab follow the status and text filters, so they match what each tab shows.
  const counted = filterEntries(entries, { ...params, type: 'all' });
  const counts = {
    all: counted.length,
    movie: counted.filter((e) => e.item.mediaType === 'movie').length,
    tv: counted.filter((e) => e.item.mediaType === 'tv').length,
    book: counted.filter((e) => e.item.mediaType === 'book').length,
  };
  const visible = sortEntries(filterEntries(entries, params), params.sort);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Libreria</h1>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
          <Library className="size-10 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">La tua libreria è vuota</p>
            <p className="text-sm text-muted-foreground">
              Cerca un film, una serie o un libro e aggiungilo con un clic.
            </p>
          </div>
          <Button asChild>
            <Link href="/search">
              <Search aria-hidden />
              Cerca un titolo
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <LibraryToolbar params={params} counts={counts} />
          {visible.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Nessun titolo corrisponde ai filtri.
            </p>
          ) : params.view === 'list' ? (
            <EntryList entries={visible} />
          ) : (
            <EntryGrid entries={visible} />
          )}
        </>
      )}
    </div>
  );
}
