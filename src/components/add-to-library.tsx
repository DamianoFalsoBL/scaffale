'use client';

import { Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { addToLibrary } from '@/actions/library';
import { StatusDot } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LibraryRef, SearchResultWithLibrary } from '@/lib/library/matching';
import { allowedStatuses, statusLabel, type EntryStatus } from '@/lib/status-labels';
import { cn } from '@/lib/utils';

/**
 * "Aggiungi" with a per-type status menu. `openOnAdd` moves to the full detail page once
 * saved (used in the preview, where the next step is rating and dates).
 */
export function AddToLibrary({
  media,
  size = 'sm',
  openOnAdd = false,
  className,
}: {
  media: SearchResultWithLibrary;
  size?: 'sm' | 'default';
  openOnAdd?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<LibraryRef | undefined>(media.library);
  const [optimistic, setOptimistic] = useState<EntryStatus>();
  const [pending, startTransition] = useTransition();

  // Once saved, the status takes the button's place with the same size and border.
  if (saved) {
    return (
      <Button asChild variant="outline" size={size} className={cn('self-start', className)}>
        <Link
          href={`/item/${saved.mediaItemId}`}
          aria-label={`${media.title}: ${statusLabel(media.mediaType, saved.status)}. Apri il dettaglio`}
        >
          <StatusDot status={saved.status} className="size-2.5" />
          {statusLabel(media.mediaType, saved.status)}
        </Link>
      </Button>
    );
  }

  function add(status: EntryStatus) {
    setOptimistic(status);
    startTransition(async () => {
      const result = await addToLibrary({
        source: media.source,
        externalId: media.externalId,
        mediaType: media.mediaType,
        status,
      });
      setOptimistic(undefined);

      if (result.ok) {
        setSaved(result.data);
        if (openOnAdd) router.push(`/item/${result.data.mediaItemId}`);
        toast.success(`“${media.title}” aggiunto alla libreria`, {
          description: statusLabel(media.mediaType, result.data.status),
        });
      } else {
        toast.error(result.error);
      }
    });
  }

  if (pending && optimistic) {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn('self-start', className)}
        disabled
        aria-busy
      >
        <Loader2 className="animate-spin" aria-hidden />
        {statusLabel(media.mediaType, optimistic)}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={size === 'sm' ? 'outline' : 'default'}
          size={size}
          className={cn('self-start', className)}
        >
          <Plus aria-hidden />
          Aggiungi
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Aggiungi come</DropdownMenuLabel>
        {allowedStatuses(media.mediaType).map((status) => (
          <DropdownMenuItem key={status} onSelect={() => add(status)}>
            <StatusDot status={status} />
            {statusLabel(media.mediaType, status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
