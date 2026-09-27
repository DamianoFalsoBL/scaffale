'use client';

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { setSeasonsWatched } from '@/actions/library';
import { Button } from '@/components/ui/button';
import type { SeasonInfo } from '@/lib/library/seasons';
import type { EntryStatus } from '@/lib/status-labels';
import { cn } from '@/lib/utils';

const dateFormat = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' });

const STATUS_TOASTS: Partial<Record<EntryStatus, string>> = {
  in_progress: 'Serie spostata in “In corso”',
  completed: 'Serie completata: le hai viste tutte',
  waiting: 'Sei in pari: serie spostata in “In attesa” della prossima stagione',
};

function seasonDetail(season: SeasonInfo) {
  const episodes = season.episodeCount === 1 ? '1 episodio' : `${season.episodeCount} episodi`;
  if (season.aired) {
    return [season.episodeCount > 0 && episodes, season.airDate?.slice(0, 4)]
      .filter(Boolean)
      .join(' · ');
  }
  return season.airDate
    ? `In arrivo il ${dateFormat.format(new Date(season.airDate))}`
    : 'Annunciata';
}

/**
 * Seasons of a series in the library: tap to mark one as seen (or not), "Fino a qui" to
 * mark every aired season up to that one. The status moves on by itself (server side).
 */
export function SeasonTracker({
  entryId,
  status,
  seasons,
  watched,
}: {
  entryId: string;
  status: EntryStatus;
  seasons: SeasonInfo[];
  watched: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(watched);

  const seen = new Set(optimistic);
  const aired = seasons.filter((season) => season.aired);
  const watchedCount = aired.filter((season) => seen.has(season.number)).length;
  const percent = aired.length ? Math.round((watchedCount / aired.length) * 100) : 0;

  function update(numbers: number[], markWatched: boolean) {
    startTransition(async () => {
      setOptimistic(
        markWatched
          ? [...new Set([...optimistic, ...numbers])]
          : optimistic.filter((number) => !numbers.includes(number)),
      );
      const result = await setSeasonsWatched({ entryId, seasons: numbers, watched: markWatched });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.status !== status) {
        const message = STATUS_TOASTS[result.data.status];
        if (message) toast.success(message);
      }
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="seasons-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="seasons-title" className="font-medium">
          Stagioni viste
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {pending && <Loader2 className="mr-1.5 inline size-3.5 animate-spin" aria-hidden />}
          {watchedCount} di {aired.length}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Stagioni viste"
        aria-valuemin={0}
        aria-valuemax={aired.length}
        aria-valuenow={watchedCount}
      >
        <div
          className="h-full rounded-full bg-tv transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="divide-y rounded-md bg-card shadow-xs ring-1 ring-foreground/10">
        {seasons.map((season) => {
          const isSeen = seen.has(season.number);
          // "Fino a qui" only helps when earlier seasons are still unmarked.
          const catchUp =
            season.aired &&
            !isSeen &&
            aired.some((other) => other.number < season.number && !seen.has(other.number));

          return (
            <li key={season.number} className="flex items-center gap-1 px-1.5">
              <button
                type="button"
                aria-pressed={isSeen}
                disabled={!season.aired}
                onClick={() => update([season.number], !isSeen)}
                className={cn(
                  'flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
                  'hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  'disabled:cursor-default disabled:hover:bg-transparent',
                )}
              >
                {isSeen ? (
                  <CheckCircle2 className="size-5 shrink-0 text-tv" aria-hidden />
                ) : (
                  <Circle
                    className={cn(
                      'size-5 shrink-0 text-muted-foreground',
                      !season.aired && 'opacity-40',
                    )}
                    aria-hidden
                  />
                )}
                <span className="min-w-0">
                  <span className={cn('block truncate', !season.aired && 'text-muted-foreground')}>
                    {season.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {seasonDetail(season)}
                  </span>
                </span>
              </button>
              {catchUp && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground pointer-coarse:h-10"
                  onClick={() =>
                    update(
                      aired
                        .filter((other) => other.number <= season.number)
                        .map((other) => other.number),
                      true,
                    )
                  }
                >
                  Fino a qui
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
