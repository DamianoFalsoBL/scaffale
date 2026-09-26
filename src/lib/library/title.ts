import { z } from 'zod';

import type { NormalizedMedia } from '@/lib/providers/types';
import { Constants } from '@/lib/supabase/database.types';

import type { LibraryItem } from './model';

/** Everything the detail sheet shows; a library item minus its catalog id. */
export type TitleData = Omit<LibraryItem, 'id'>;

export function toTitleData(media: NormalizedMedia): TitleData {
  return {
    mediaType: media.mediaType,
    source: media.source,
    externalId: media.externalId,
    title: media.title,
    originalTitle: media.originalTitle ?? null,
    year: media.year ?? null,
    posterUrl: media.posterUrl ?? null,
    overview: media.overview ?? null,
    genres: media.genres ?? [],
    isbn13: media.isbn13 ?? null,
    extra: media.extra,
  };
}

/** Preview page of a title that may not be in the library yet. */
export function titleHref(media: Pick<NormalizedMedia, 'source' | 'mediaType' | 'externalId'>) {
  return `/title/${media.source}/${media.mediaType}/${encodeURIComponent(media.externalId)}`;
}

export const titleParamsSchema = z
  .object({
    source: z.enum(Constants.public.Enums.media_source),
    type: z.enum(Constants.public.Enums.media_type),
    // Provider ids: TMDB digits, Google volume ids, Open Library works (OL…W).
    id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  })
  .refine(({ source, type }) => (source === 'tmdb') === (type !== 'book'), {
    message: 'TMDB serves movies and series, the other sources serve books',
  })
  .refine(({ source, id }) => source !== 'tmdb' || /^\d+$/.test(id), {
    message: 'TMDB ids are numeric',
  })
  .refine(({ source, id }) => source !== 'open_library' || /^OL\d+W$/.test(id), {
    message: 'Open Library ids are works',
  });
