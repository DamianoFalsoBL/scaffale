import type { MediaType, NormalizedMedia, Source } from '@/lib/providers/types';

/** TMDB data must not be older than 6 months: refresh well before that. */
export const STALE_AFTER_DAYS = 150;
export const DEFAULT_BATCH_SIZE = 25;
const DAY_MS = 86_400_000;

export interface StaleItem {
  id: string;
  source: Source;
  externalId: string;
  mediaType: MediaType;
}

export interface RefreshDeps {
  loadStale: (cutoffIso: string, limit: number) => Promise<StaleItem[]>;
  fetchDetails: (item: StaleItem) => Promise<NormalizedMedia>;
  save: (id: string, media: NormalizedMedia) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
}

export interface RefreshSummary {
  checked: number;
  refreshed: number;
  failed: { id: string; source: Source; externalId: string; error: string }[];
}

export function staleCutoff(now = new Date()) {
  return new Date(now.getTime() - STALE_AFTER_DAYS * DAY_MS).toISOString();
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Refreshes the stalest catalog items one at a time, pausing between requests to stay
 * well inside provider rate limits. A failing item is recorded and skipped.
 */
export async function refreshStaleItems(
  deps: RefreshDeps,
  { now = new Date(), limit = DEFAULT_BATCH_SIZE, delayMs = 250 } = {},
): Promise<RefreshSummary> {
  const sleep = deps.sleep ?? defaultSleep;
  const items = await deps.loadStale(staleCutoff(now), limit);
  const summary: RefreshSummary = { checked: items.length, refreshed: 0, failed: [] };

  for (const [index, item] of items.entries()) {
    if (index > 0) await sleep(delayMs);

    try {
      const media = await deps.fetchDetails(item);
      await deps.save(item.id, media);
      summary.refreshed++;
    } catch (error) {
      summary.failed.push({
        id: item.id,
        source: item.source,
        externalId: item.externalId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}
