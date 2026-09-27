import { Library, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EntryGrid, EntryList } from '@/components/library-views';
import { Button } from '@/components/ui/button';
import { findWatchProvider } from '@/lib/catalogs';
import { summarizeLists } from '@/lib/library/lists';
import { getLibrary, getLists } from '@/lib/library/queries';
import type { LibraryEntry } from '@/lib/library/model';
import { filterEntries, sortEntries, type StreamingAvailability } from '@/lib/library/views';
import { getStreamingAvailability } from '@/lib/providers';
import { libraryParamsSchema } from '@/lib/validation/library';

import { LibraryLists } from './library-lists';
import { LibraryToolbar } from './library-toolbar';

export const metadata: Metadata = {
  title: 'Libreria',
};

/** Platforms of the movies and series the other filters keep (only with a platform filter). */
async function loadAvailability(entries: LibraryEntry[]) {
  const items = entries.flatMap((entry) =>
    entry.item.mediaType === 'movie' || entry.item.mediaType === 'tv'
      ? [{ id: entry.item.id, externalId: entry.item.externalId, mediaType: entry.item.mediaType }]
      : [],
  );
  return getStreamingAvailability(items);
}

export default async function LibraryPage({ searchParams }: PageProps<'/library'>) {
  const parsed = libraryParamsSchema.parse(await searchParams);
  const [entries, lists] = await Promise.all([getLibrary(), getLists()]);
  const summaries = summarizeLists(lists, entries);
  const activeList = summaries.find((list) => list.id === parsed.list);
  // A deleted or unknown list shows the whole library.
  const params = activeList ? parsed : { ...parsed, list: '' };

  const provider = findWatchProvider(params.provider);
  let availability: StreamingAvailability = new Map();
  let unknown = 0;
  if (provider) {
    const loaded = await loadAvailability(
      filterEntries(entries, { ...params, type: 'all', provider: '' }),
    );
    availability = loaded.available;
    unknown = loaded.failed;
  }

  // Counts per tab follow the other filters, so they match what each tab shows.
  const counted = filterEntries(entries, { ...params, type: 'all' }, availability);
  const counts = {
    all: counted.length,
    movie: counted.filter((e) => e.item.mediaType === 'movie').length,
    tv: counted.filter((e) => e.item.mediaType === 'tv').length,
    book: counted.filter((e) => e.item.mediaType === 'book').length,
  };
  const visible = sortEntries(filterEntries(entries, params, availability), params.sort);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Libreria</h1>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed bg-card px-6 py-16 text-center">
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
          <LibraryLists lists={summaries} params={params} />
          {activeList && (
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{activeList.name}</h2>
              {activeList.description && (
                <p className="text-sm text-muted-foreground">{activeList.description}</p>
              )}
            </div>
          )}
          <LibraryToolbar params={params} counts={counts} />
          {provider && (
            <p className="text-sm text-muted-foreground" role="status">
              Film e serie che puoi vedere su {provider.label} in abbonamento o gratis
              {params.type === 'all' || params.type === 'book' ? ' (i libri non sono inclusi)' : ''}
              .
              {unknown > 0 &&
                ` Per ${unknown === 1 ? 'un titolo' : `${unknown} titoli`} la disponibilità non è arrivata: riprova più tardi.`}{' '}
              Dati di JustWatch tramite TMDB.
            </p>
          )}
          {visible.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {activeList && activeList.count === 0
                ? 'Questa lista è vuota: aggiungi titoli dalla loro scheda, con “Aggiungi a lista”.'
                : 'Nessun titolo corrisponde ai filtri.'}
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
