import Link from 'next/link';

import { MediaTypeBadge } from '@/components/media-type-badge';
import { Poster } from '@/components/poster';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAuthors } from '@/lib/format';
import type { MediaType } from '@/lib/providers/types';
import { cn } from '@/lib/utils';

export interface MediaCardData {
  title: string;
  mediaType: MediaType;
  posterUrl?: string | null;
  year?: number | null;
  authors?: string[];
  /** Extra detail after year/authors, e.g. a role in someone's filmography. */
  note?: string;
}

export const POSTER_SIZES = '(min-width: 1024px) 180px, (min-width: 640px) 25vw, 45vw';

/** Year, plus "di Autore" for books. */
export function cardSubtitle({
  year,
  authors = [],
  note,
}: Pick<MediaCardData, 'year' | 'authors' | 'note'>) {
  return [year, formatAuthors(authors), note].filter(Boolean).join(' · ');
}

/**
 * Poster card. Title and subtitle always take the same height (two lines + one line),
 * and `children` (status, add button…) sit at the bottom, so cards in a row stay aligned.
 * With `href` the poster and title link to the detail page.
 */
export function MediaCard({
  media,
  href,
  showType = true,
  children,
}: {
  media: MediaCardData;
  href?: string;
  showType?: boolean;
  children?: React.ReactNode;
}) {
  const details = cardSubtitle(media);
  const body = (
    <>
      <div
        className={cn(
          'relative',
          href && 'transition-transform duration-200 motion-safe:group-hover:-translate-y-1',
        )}
      >
        <Poster
          src={media.posterUrl ?? undefined}
          alt=""
          mediaType={media.mediaType}
          sizes={POSTER_SIZES}
          className={href ? 'transition-shadow duration-200 group-hover:shadow-md' : undefined}
        />
        {showType && (
          <MediaTypeBadge mediaType={media.mediaType} className="absolute top-2 left-2 shadow-sm" />
        )}
      </div>
      <div className="min-w-0">
        <h3
          className="line-clamp-2 min-h-[2lh] font-heading text-[15px] leading-snug font-medium group-hover:underline"
          title={media.title}
        >
          {media.title}
        </h3>
        <p className="min-h-[1lh] truncate text-xs text-muted-foreground" title={details}>
          {details}
        </p>
      </div>
    </>
  );

  return (
    <article className="flex h-full flex-col gap-2 duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1">
      {href ? (
        <Link
          href={href}
          className="group flex flex-col gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {body}
        </Link>
      ) : (
        body
      )}
      {children && <div className="mt-auto flex flex-col items-start">{children}</div>}
    </article>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="aspect-2/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
