import { Tv } from 'lucide-react';
import Link from 'next/link';

import { EntryCard } from '@/components/library-views';
import { MediaCardSkeleton } from '@/components/media-card';
import { Shelf } from '@/components/shelf';
import { Skeleton } from '@/components/ui/skeleton';
import type { WatchProviderSlug } from '@/lib/catalogs';
import type { LibraryEntry } from '@/lib/library/model';
import { plannedStreamable, watchNow } from '@/lib/library/views';
import { getStreamingAvailability } from '@/lib/providers';

const TITLE = 'Puoi vederli subito';
const SHELF_SIZE = 20;

/** Asks to pick the streaming services, when there is something they could help with. */
export function PickServicesHint() {
  return (
    <p className="flex items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
      <Tv className="size-4 shrink-0" aria-hidden />
      <span>
        <Link
          href="/profile#piattaforme"
          className="text-primary underline-offset-4 hover:underline"
        >
          Scegli le tue piattaforme
        </Link>{' '}
        per vedere qui i titoli da vedere che puoi guardare subito.
      </span>
    </p>
  );
}

/**
 * Planned movies and series on the user's streaming services (live JustWatch data via
 * TMDB, cached for a day). Streams in on its own: the rest of the page doesn't wait.
 */
export async function WatchNowShelf({
  entries,
  myProviders,
}: {
  entries: LibraryEntry[];
  myProviders: WatchProviderSlug[];
}) {
  const candidates = plannedStreamable(entries);
  const { available } = await getStreamingAvailability(
    candidates.map((entry) => ({
      id: entry.item.id,
      externalId: entry.item.externalId,
      mediaType: entry.item.mediaType as 'movie' | 'tv',
    })),
  );
  const titles = watchNow(candidates, available, myProviders);

  if (titles.length === 0) {
    return (
      <section className="flex flex-col gap-3" aria-label={TITLE}>
        <h2 className="border-b pb-2 text-xl font-semibold">{TITLE}</h2>
        <p className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
          Nessun titolo da vedere è sulle tue piattaforme in questo momento.{' '}
          <Link
            href="/profile#piattaforme"
            className="text-primary underline-offset-4 hover:underline"
          >
            Cambia piattaforme
          </Link>
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Shelf title={TITLE} href="/library?status=planned&provider=mine" count={titles.length}>
        {titles.slice(0, SHELF_SIZE).map(({ entry, services }) => (
          <div key={entry.id} className="w-36 shrink-0 snap-start sm:w-40">
            <EntryCard entry={entry} note={services.map((service) => service.label).join(' · ')} />
          </div>
        ))}
      </Shelf>
      <p className="text-xs text-muted-foreground">
        In abbonamento o gratis. Disponibilità fornita da JustWatch tramite TMDB.
      </p>
    </div>
  );
}

export function WatchNowSkeleton() {
  return (
    <section className="flex flex-col gap-3" aria-busy aria-label={`${TITLE}: caricamento`}>
      <Skeleton className="h-8 w-56" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="w-36 shrink-0 sm:w-40">
            <MediaCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}
