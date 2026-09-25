import { Poster } from '@/components/poster';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MEDIA_TYPE_LABELS } from '@/lib/media-labels';
import type { NormalizedMedia } from '@/lib/providers/types';

function subtitle(media: NormalizedMedia) {
  const authors = Array.isArray(media.extra.authors) ? (media.extra.authors as string[]) : [];
  return [media.year, authors.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
}

export function MediaCard({ media }: { media: NormalizedMedia }) {
  const details = subtitle(media);

  return (
    <article className="flex flex-col gap-2">
      <div className="relative">
        <Poster
          src={media.posterUrl}
          alt={media.title}
          mediaType={media.mediaType}
          sizes="(min-width: 1024px) 180px, (min-width: 640px) 25vw, 45vw"
        />
        <Badge variant="secondary" className="absolute top-2 left-2 shadow-sm">
          {MEDIA_TYPE_LABELS[media.mediaType]}
        </Badge>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium" title={media.title}>
          {media.title}
        </h3>
        {details && <p className="truncate text-xs text-muted-foreground">{details}</p>}
      </div>
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
