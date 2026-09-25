'use client';

import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { changeEntryStatus } from '@/actions/library';
import { StatusDot } from '@/components/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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

/** Status pill that changes status in place, updating optimistically. */
export function EntryStatusMenu({
  entryId,
  mediaType,
  status,
  title,
  className,
}: {
  entryId: string;
  mediaType: MediaType;
  status: EntryStatus;
  title: string;
  className?: string;
}) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [pending, startTransition] = useTransition();

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
