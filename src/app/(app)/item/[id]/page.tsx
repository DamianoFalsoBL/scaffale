import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';
import { z } from 'zod';

import { TitleDetails } from '@/components/title-details';
import {
  TitleExtrasSection,
  TitleExtrasSkeleton,
  WhereToWatchSection,
  WhereToWatchSkeleton,
} from '@/components/title-extras';
import { getEntryByMediaItem } from '@/lib/library/queries';

import { EntryForm } from './entry-form';
import { RemoveEntryButton } from './remove-entry-button';

const loadEntry = cache(async (id: string) =>
  z.uuid().safeParse(id).success ? getEntryByMediaItem(id) : null,
);

export async function generateMetadata({ params }: PageProps<'/item/[id]'>): Promise<Metadata> {
  const entry = await loadEntry((await params).id);
  return { title: entry?.item.title ?? 'Titolo non trovato' };
}

export default async function ItemPage({ params }: PageProps<'/item/[id]'>) {
  const entry = await loadEntry((await params).id);
  if (!entry) notFound();

  const { item } = entry;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Libreria
      </Link>

      <TitleDetails item={item} />

      {/* Streaming first: before deciding what to watch, where to watch it. Not for books. */}
      {item.source === 'tmdb' && item.mediaType !== 'book' && (
        <Suspense fallback={<WhereToWatchSkeleton />}>
          <WhereToWatchSection
            source={item.source}
            externalId={item.externalId}
            mediaType={item.mediaType}
          />
        </Suspense>
      )}

      <section className="flex flex-col gap-4 rounded-md bg-card p-4 shadow-xs ring-1 ring-foreground/10 sm:p-6">
        <h2 className="text-lg font-semibold">I miei dati</h2>
        <EntryForm
          key={entry.updatedAt}
          entryId={entry.id}
          mediaType={item.mediaType}
          initial={{
            status: entry.status,
            rating: entry.rating,
            startedAt: entry.startedAt,
            finishedAt: entry.finishedAt,
            timesCompleted: entry.timesCompleted,
            notes: entry.notes,
          }}
        />
      </section>

      <Suspense fallback={<TitleExtrasSkeleton />}>
        <TitleExtrasSection
          source={item.source}
          externalId={item.externalId}
          mediaType={item.mediaType}
          withProviders={false}
        />
      </Suspense>

      <div>
        <RemoveEntryButton entryId={entry.id} title={item.title} />
      </div>
    </div>
  );
}
