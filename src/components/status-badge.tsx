import type { MediaType } from '@/lib/providers/types';
import { statusLabel, type EntryStatus } from '@/lib/status-labels';
import { cn } from '@/lib/utils';

// The dot is a secondary cue: the label always carries the meaning.
export const STATUS_DOT: Record<EntryStatus, string> = {
  planned: 'bg-sky-500',
  in_progress: 'bg-amber-500',
  waiting: 'bg-violet-400',
  completed: 'bg-emerald-500',
  dropped: 'bg-rose-500',
};

export function StatusDot({ status, className }: { status: EntryStatus; className?: string }) {
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', STATUS_DOT[status], className)}
      aria-hidden
    />
  );
}

export function StatusBadge({
  mediaType,
  status,
  className,
}: {
  mediaType: MediaType;
  status: EntryStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-background/90 px-2 py-0.5 text-xs font-medium backdrop-blur-sm',
        className,
      )}
    >
      <StatusDot status={status} />
      {statusLabel(mediaType, status)}
    </span>
  );
}
