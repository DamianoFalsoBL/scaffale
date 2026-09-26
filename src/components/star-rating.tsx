'use client';

import { Star, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatStars } from '@/lib/format';
import { cn } from '@/lib/utils';

const STARS = [1, 2, 3, 4, 5] as const;

/** 0, 50 or 100: how much of star n (1–5) a 1–10 rating fills. */
function fillPercent(star: number, rating: number | null) {
  const filled = (rating ?? 0) - (star - 1) * 2;
  return filled >= 2 ? 100 : filled === 1 ? 50 : 0;
}

function StarIcon({ percent, className }: { percent: number; className?: string }) {
  return (
    <span className={cn('relative inline-block', className)}>
      <Star className="size-full text-muted-foreground/40" aria-hidden />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${percent}%` }}>
        <Star className="size-full fill-star text-star" aria-hidden />
      </span>
    </span>
  );
}

/** Read-only stars (0.5–5) for cards and lists. */
export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center', className)}
      role="img"
      aria-label={`${formatStars(rating)} stelle su 5`}
    >
      {STARS.map((star) => (
        <StarIcon key={star} percent={fillPercent(star, rating)} className="size-3.5" />
      ))}
    </span>
  );
}

/**
 * Half-star input stored as 1–10. Click the left or right half of a star;
 * as a slider it also works with arrow keys, Home (no rating) and End.
 */
export function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  function onKeyDown(event: React.KeyboardEvent) {
    const current = value ?? 0;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? Math.min(current + 1, 10)
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? Math.max(current - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 10
              : undefined;

    if (next !== undefined) {
      event.preventDefault();
      onChange(next === 0 ? null : next);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Voto"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
        aria-valuetext={value ? `${formatStars(value)} stelle su 5` : 'Nessun voto'}
        aria-disabled={disabled}
        onKeyDown={disabled ? undefined : onKeyDown}
        className="flex rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {STARS.map((star) => (
          <span key={star} className="relative">
            <StarIcon percent={fillPercent(star, value)} className="size-7" />
            {!disabled &&
              ([star * 2 - 1, star * 2] as const).map((rating, half) => (
                <button
                  key={rating}
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  className={cn(
                    'absolute inset-y-0 w-1/2 cursor-pointer',
                    half === 0 ? 'left-0' : 'right-0',
                  )}
                  onClick={() => onChange(rating === value ? null : rating)}
                />
              ))}
          </span>
        ))}
      </div>
      <span className="min-w-12 text-sm text-muted-foreground tabular-nums">
        {value ? `${formatStars(value)}/5` : 'Nessun voto'}
      </span>
      {value !== null && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Rimuovi voto"
          onClick={() => onChange(null)}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
