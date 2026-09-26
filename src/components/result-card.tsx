import { Info } from 'lucide-react';
import Link from 'next/link';

import { AddToLibrary } from '@/components/add-to-library';
import { MediaCard } from '@/components/media-card';
import { Button } from '@/components/ui/button';
import type { SearchResultWithLibrary } from '@/lib/library/matching';
import { detailsHref } from '@/lib/library/title';

function authorsOf(media: SearchResultWithLibrary) {
  const { authors } = media.extra;
  return Array.isArray(authors) ? authors.filter((a): a is string => typeof a === 'string') : [];
}

/**
 * A title from an external source (search, filmography, recommendations):
 * poster card with "Aggiungi" and "Dettagli".
 */
export function ResultCard({ media, note }: { media: SearchResultWithLibrary; note?: string }) {
  const href = detailsHref(media);

  return (
    <MediaCard media={{ ...media, authors: authorsOf(media), note }} href={href}>
      {/* Side by side on desktop; stacked full-width on phones, where cards are narrow. */}
      <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
        <AddToLibrary media={media} className="px-2 max-sm:w-full" />
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="px-2 text-muted-foreground max-sm:w-full"
        >
          <Link href={href}>
            <Info aria-hidden />
            Dettagli
          </Link>
        </Button>
      </div>
    </MediaCard>
  );
}
