'use client';

import { BookOpen, Film, Tv } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import type { MediaType } from '@/lib/providers/types';
import { cn } from '@/lib/utils';

const PLACEHOLDER_ICONS = { movie: Film, tv: Tv, book: BookOpen } as const;

/**
 * 2:3 cover with an icon placeholder when the image is missing or fails
 * (Open Library ISBN covers 404 on purpose when they don't exist).
 */
export function Poster({
  src,
  alt,
  mediaType,
  sizes,
  className,
}: {
  src?: string;
  alt: string;
  mediaType: MediaType;
  sizes: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const Icon = PLACEHOLDER_ICONS[mediaType];

  return (
    <div
      className={cn(
        // Book-like corners, a hairline edge and a soft shadow, like a cover on a shelf.
        'relative aspect-2/3 overflow-hidden rounded-[3px] bg-muted shadow-sm ring-1 ring-foreground/10',
        className,
      )}
    >
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          // External CDNs already serve sized images: skip Vercel image optimization.
          unoptimized
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-secondary text-muted-foreground/70">
          <Icon className="size-8" strokeWidth={1.5} aria-hidden />
        </div>
      )}
    </div>
  );
}
