import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache, Suspense } from 'react';

import { AddToLibrary } from '@/components/add-to-library';
import { BackLink } from '@/components/back-link';
import { TitleDetails } from '@/components/title-details';
import { TitleExtrasSection, TitleExtrasSkeleton } from '@/components/title-extras';
import { markLibraryEntries } from '@/lib/library/matching';
import { getLibraryIndex } from '@/lib/library/queries';
import { titleParamsSchema, toTitleData } from '@/lib/library/title';
import { getDetails } from '@/lib/providers';
import { ProviderError } from '@/lib/providers/http';

/** Details from the provider (cached 24h by fetch); missing titles become a 404. */
const loadTitle = cache(async (rawParams: { source: string; type: string; id: string }) => {
  const params = titleParamsSchema.safeParse({
    ...rawParams,
    id: decodeURIComponent(rawParams.id),
  });
  if (!params.success) return null;

  try {
    return await getDetails(params.data.source, params.data.id, params.data.type);
  } catch (error) {
    if (error instanceof ProviderError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/title/[source]/[type]/[id]'>): Promise<Metadata> {
  const media = await loadTitle(await params);
  return { title: media?.title ?? 'Titolo non trovato' };
}

/** Preview of a search result that is not in the library yet. */
export default async function TitlePreviewPage({
  params,
}: PageProps<'/title/[source]/[type]/[id]'>) {
  const [media, index] = await Promise.all([loadTitle(await params), getLibraryIndex()]);
  if (!media) notFound();

  // Already in the library (same id, or same book from another source): show the real page.
  const [marked] = markLibraryEntries([media], index);
  if (marked?.library) {
    redirect(`/item/${marked.library.mediaItemId}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <BackLink fallback="/search" label="Indietro" />
      <TitleDetails
        item={toTitleData(media)}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <AddToLibrary media={media} size="default" openOnAdd />
            <span className="text-sm text-muted-foreground">Non è ancora nella tua libreria.</span>
          </div>
        }
      />
      <Suspense fallback={<TitleExtrasSkeleton />}>
        <TitleExtrasSection
          source={media.source}
          externalId={media.externalId}
          mediaType={media.mediaType}
        />
      </Suspense>
    </div>
  );
}
