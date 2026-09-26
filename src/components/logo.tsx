import { cn } from '@/lib/utils';

/** Scaffale mark: three spines and a leaning book on a shelf. Ink = currentColor. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-6', className)} aria-hidden fill="currentColor">
      <rect x="5" y="9" width="4" height="15" rx="0.75" />
      <rect x="10" y="5" width="5" height="19" rx="0.75" className="fill-primary" />
      <rect x="16" y="8" width="4" height="16" rx="0.75" />
      <rect
        x="21.2"
        y="7.4"
        width="4"
        height="16"
        rx="0.75"
        transform="rotate(14 23.2 24)"
        opacity="0.55"
      />
      <rect x="3" y="24.5" width="26" height="2" rx="1" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-heading text-xl font-semibold tracking-tight">Scaffale</span>
    </span>
  );
}
