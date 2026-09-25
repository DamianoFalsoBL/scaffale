import { z } from 'zod';

import type { MediaType } from '@/lib/providers/types';

// Snapshots in media_items.extra come from the providers; parse them defensively
// so an old or partial snapshot never breaks the detail page.

const optionalNumber = z.number().optional().catch(undefined);
const optionalString = z.string().optional().catch(undefined);

const movieExtraSchema = z.object({
  runtime: optionalNumber,
  tagline: optionalString,
});

const tvExtraSchema = z.object({
  status: optionalString,
  numberOfSeasons: optionalNumber,
  numberOfEpisodes: optionalNumber,
  episodeRuntime: optionalNumber,
  seasons: z
    .array(
      z.object({
        seasonNumber: z.number(),
        episodeCount: z.number(),
        name: z.string(),
        airDate: z.string().optional(),
      }),
    )
    .catch([]),
});

const bookExtraSchema = z.object({
  authors: z.array(z.string()).catch([]),
  subtitle: optionalString,
  publisher: optionalString,
  pageCount: optionalNumber,
});

export type MovieExtra = z.infer<typeof movieExtraSchema>;
export type TvExtra = z.infer<typeof tvExtraSchema>;
export type BookExtra = z.infer<typeof bookExtraSchema>;

export type ParsedExtra =
  | { mediaType: 'movie'; extra: MovieExtra }
  | { mediaType: 'tv'; extra: TvExtra }
  | { mediaType: 'book'; extra: BookExtra };

export function parseExtra(mediaType: MediaType, extra: Record<string, unknown>): ParsedExtra {
  switch (mediaType) {
    case 'movie':
      return { mediaType, extra: movieExtraSchema.parse(extra) };
    case 'tv':
      return { mediaType, extra: tvExtraSchema.parse(extra) };
    case 'book':
      return { mediaType, extra: bookExtraSchema.parse(extra) };
  }
}

const TV_STATUS_LABELS: Record<string, string> = {
  'Returning Series': 'In corso',
  Ended: 'Conclusa',
  Canceled: 'Cancellata',
  'In Production': 'In produzione',
  Planned: 'Annunciata',
  Pilot: 'Episodio pilota',
};

export function tvStatusLabel(status: string | undefined) {
  return status ? (TV_STATUS_LABELS[status] ?? status) : undefined;
}

export function formatRuntime(minutes: number | undefined) {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h ${rest.toString().padStart(2, '0')} min` : `${rest} min`;
}
