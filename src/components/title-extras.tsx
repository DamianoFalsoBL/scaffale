import { ExternalLink } from 'lucide-react';
import Image from 'next/image';

import { PersonCard } from '@/components/person-card';
import { ResultCard } from '@/components/result-card';
import { Shelf } from '@/components/shelf';
import { Skeleton } from '@/components/ui/skeleton';
import { markLibraryEntries } from '@/lib/library/matching';
import { getLibraryIndex } from '@/lib/library/queries';
import { getTitleExtras, type WatchProvider, type WatchProviders } from '@/lib/providers';
import type { MediaType, Source } from '@/lib/providers/types';

const PROVIDER_GROUPS: { key: keyof Omit<WatchProviders, 'link'>; label: string }[] = [
  { key: 'flatrate', label: 'In abbonamento' },
  { key: 'free', label: 'Gratis' },
  { key: 'rent', label: 'Noleggio' },
  { key: 'buy', label: 'Acquisto' },
];

function ProviderLogo({ provider }: { provider: WatchProvider }) {
  return (
    <li className="flex items-center gap-2 rounded-md bg-card py-1 pr-3 pl-1 text-sm shadow-xs ring-1 ring-foreground/10">
      {provider.logoUrl ? (
        <Image
          src={provider.logoUrl}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-7 rounded-sm"
        />
      ) : (
        <span className="size-7 rounded-sm bg-secondary" aria-hidden />
      )}
      {provider.name}
    </li>
  );
}

function WhereToWatch({ providers }: { providers: WatchProviders | null }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Dove vederlo in Italia">
      <h2 className="border-b pb-2 text-xl font-semibold">Dove vederlo in Italia</h2>
      {providers ? (
        <>
          {PROVIDER_GROUPS.filter(({ key }) => providers[key].length > 0).map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
              <p className="w-32 shrink-0 pt-1.5 text-sm text-muted-foreground">{label}</p>
              <ul className="flex flex-wrap gap-2">
                {providers[key].map((provider) => (
                  <ProviderLogo key={provider.id} provider={provider} />
                ))}
              </ul>
            </div>
          ))}
          {/* JustWatch attribution is required by TMDB for this data. */}
          <p className="text-xs text-muted-foreground">
            Disponibilità fornita da JustWatch tramite TMDB.{' '}
            {providers.link && (
              <a
                href={providers.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
              >
                Tutte le offerte
                <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Al momento non risulta disponibile su piattaforme italiane.
        </p>
      )}
    </section>
  );
}

/**
 * Cast, directors, streaming availability and recommendations for movies and series.
 * Rendered inside <Suspense>: the page shows first, this streams in when TMDB answers.
 */
export async function TitleExtrasSection({
  source,
  externalId,
  mediaType,
}: {
  source: Source;
  externalId: string;
  mediaType: MediaType;
}) {
  if (source !== 'tmdb' || mediaType === 'book') {
    return null;
  }

  let extras;
  let index;
  try {
    [extras, index] = await Promise.all([getTitleExtras(externalId, mediaType), getLibraryIndex()]);
  } catch (error) {
    console.error('Title extras failed', { externalId, error });
    return (
      <p className="text-sm text-muted-foreground">
        Cast e disponibilità non sono raggiungibili al momento.
      </p>
    );
  }

  const people = [
    ...extras.directors.map((p) => ({ ...p, detail: p.role })),
    ...extras.cast.map((p) => ({ ...p, detail: p.role })),
  ];
  const recommendations = markLibraryEntries(extras.recommendations, index);

  return (
    <div className="flex flex-col gap-10">
      {people.length > 0 && (
        <Shelf title={mediaType === 'movie' ? 'Regia e cast' : 'Ideazione e cast'}>
          {people.map((person) => (
            <PersonCard
              key={`${person.id}-${person.detail}`}
              id={person.id}
              name={person.name}
              profileUrl={person.profileUrl}
              detail={person.detail}
              className="w-28 shrink-0 snap-start sm:w-32"
            />
          ))}
        </Shelf>
      )}

      <WhereToWatch providers={extras.providers} />

      {recommendations.length > 0 && (
        <Shelf title="Titoli simili">
          {recommendations.map((media) => (
            <div key={media.externalId} className="w-36 shrink-0 snap-start sm:w-40">
              <ResultCard media={media} />
            </div>
          ))}
        </Shelf>
      )}
    </div>
  );
}

export function TitleExtrasSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Caricamento di cast e disponibilità">
      <Skeleton className="h-7 w-40" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-2/3 w-28 shrink-0 sm:w-32" />
        ))}
      </div>
    </div>
  );
}
