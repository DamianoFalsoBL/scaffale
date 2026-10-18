'use client';

import { BookmarkMinus, BookmarkPlus, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { changeEntryStatus, setUpNext } from '@/actions/library';
import { StatusDot } from '@/components/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MediaType } from '@/lib/providers/types';
import {
  allowedStatuses,
  ENTRY_STATUSES,
  statusLabel,
  type EntryStatus,
} from '@/lib/status-labels';
import { cn } from '@/lib/utils';

/**
 * Status pill that changes status in place, updating optimistically. With `upNext`
 * (library entries), planned titles also get "Metti tra i prossimi" / "Togli dai prossimi".
 */
export function EntryStatusMenu({
  entryId,
  mediaType,
  status,
  title,
  upNext,
  className,
}: {
  entryId: string;
  mediaType: MediaType;
  status: EntryStatus;
  title: string;
  upNext?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [optimisticUpNext, setOptimisticUpNext] = useOptimistic(upNext);
  const [pending, startTransition] = useTransition();

  function toggleUpNext() {
    const next = !optimisticUpNext;
    startTransition(async () => {
      setOptimisticUpNext(next);
      const result = await setUpNext({ entryId, upNext: next });
      if (result.ok) {
        toast.success(next ? `“${title}” è tra i prossimi` : `“${title}” tolto dai prossimi`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function change(value: string) {
    const next = ENTRY_STATUSES.find((s) => s === value);
    if (!next || next === optimisticStatus) return;

    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await changeEntryStatus({ entryId, status: next });
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-expanded:bg-muted',
          pending && 'opacity-70',
          className,
        )}
        aria-label={`Stato di “${title}”: ${statusLabel(mediaType, optimisticStatus)}. Cambia stato`}
      >
        <StatusDot status={optimisticStatus} />
        {statusLabel(mediaType, optimisticStatus)}
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={optimisticStatus} onValueChange={change}>
          {allowedStatuses(mediaType).map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <StatusDot status={value} />
              {statusLabel(mediaType, value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {upNext !== undefined && optimisticStatus === 'planned' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggleUpNext}>
              {optimisticUpNext ? <BookmarkMinus aria-hidden /> : <BookmarkPlus aria-hidden />}
              {optimisticUpNext ? 'Togli dai prossimi' : 'Metti tra i prossimi'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
