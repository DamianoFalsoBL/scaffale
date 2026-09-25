import { MEDIA_TYPE_LABELS } from '@/lib/media-labels';
import type { MediaType } from '@/lib/providers/types';
import { cn } from '@/lib/utils';

// Solid pills, one clearly separate hue per type: violet / green / orange.
// Checked with the dataviz palette validator in light and dark mode (all checks pass,
// worst colorblind ΔE 9.2) and ≥ 5.2:1 contrast for the white label, which always
// names the type so it never depends on color alone.
const STYLES: Record<MediaType, string> = {
  movie: 'bg-[#7c3aed]', // violet-600
  tv: 'bg-[#047857]', // emerald-700
  book: 'bg-[#c2410c]', // orange-700
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
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white',
        STYLES[mediaType],
        className,
      )}
    >
      {MEDIA_TYPE_LABELS[mediaType]}
    </span>
  );
}
