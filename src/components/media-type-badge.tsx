import { MEDIA_TYPE_LABELS } from '@/lib/media-labels';
import type { MediaType } from '@/lib/providers/types';
import { cn } from '@/lib/utils';

// One hue per type — plum (movie), green (tv), ink blue (book) — defined as --movie/--tv/--book
// in globals.css, with a label color per theme that keeps ≥ 4.5:1. Validated together with
// the ochre accent so a book tag never reads as a button; the label always names the type.
const STYLES: Record<MediaType, string> = {
  movie: 'bg-movie text-movie-foreground',
  tv: 'bg-tv text-tv-foreground',
  book: 'bg-book text-book-foreground',
};

export function MediaTypeBadge({
  mediaType,
  className,
}: {
  mediaType: MediaType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STYLES[mediaType],
        className,
      )}
    >
      {MEDIA_TYPE_LABELS[mediaType]}
    </span>
  );
}
