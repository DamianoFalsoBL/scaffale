import { z } from 'zod';

import { WATCH_PROVIDER_SLUGS } from '@/lib/catalogs';
import { Constants } from '@/lib/supabase/database.types';

const { entry_status, media_source, media_type } = Constants.public.Enums;

const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

const isoDate = z.preprocess(emptyToNull, z.iso.date().nullable());

export const addEntrySchema = z.object({
  source: z.enum(media_source),
  externalId: z.string().trim().min(1).max(100),
  mediaType: z.enum(media_type),
  status: z.enum(entry_status),
});

export const statusChangeSchema = z.object({
  entryId: z.uuid(),
  status: z.enum(entry_status),
});

export const updateEntrySchema = z
  .object({
    entryId: z.uuid(),
    status: z.enum(entry_status),
    rating: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(10).nullable()),
    startedAt: isoDate,
    finishedAt: isoDate,
    timesCompleted: z.coerce.number().int().min(0).max(999),
    notes: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.string().trim().max(5000).nullable(),
    ),
  })
  .refine((entry) => !entry.startedAt || !entry.finishedAt || entry.finishedAt >= entry.startedAt, {
    message: 'La data di fine non può precedere quella di inizio.',
    path: ['finishedAt'],
  });

/** Mark seasons as seen (or not): one season, or every one up to a season ("fino a qui"). */
export const seasonsSchema = z.object({
  entryId: z.uuid(),
  seasons: z.array(z.number().int().min(1).max(500)).min(1).max(100),
  watched: z.boolean(),
});

export const LIBRARY_SORTS = ['added', 'title', 'rating', 'year'] as const;
export const LIBRARY_VIEWS = ['grid', 'list'] as const;

/** Library URL state; invalid values fall back to defaults instead of failing. */
export const libraryParamsSchema = z.object({
  type: z.enum(['all', ...media_type]).catch('all'),
  status: z.enum(['all', ...entry_status]).catch('all'),
  sort: z.enum(LIBRARY_SORTS).catch('added'),
  view: z.enum(LIBRARY_VIEWS).catch('grid'),
  q: z.string().trim().max(100).catch(''),
  list: z.uuid().catch(''),
  provider: z.enum(['', ...WATCH_PROVIDER_SLUGS]).catch(''),
});

const listName = z
  .string()
  .trim()
  .min(1, 'Dai un nome alla lista.')
  .max(60, 'Il nome può avere al massimo 60 caratteri.');
const listDescription = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().max(280, 'La descrizione può avere al massimo 280 caratteri.').nullable(),
);

export const createListSchema = z.object({ name: listName, description: listDescription });
export const updateListSchema = createListSchema.extend({ listId: z.uuid() });
export const listItemSchema = z.object({ listId: z.uuid(), entryId: z.uuid() });
/** A title from search or preview: added to the library (as planned) if needed. */
export const addTitleToListSchema = addEntrySchema
  .omit({ status: true })
  .extend({ listId: z.uuid() });

export type AddEntryInput = z.infer<typeof addEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type SeasonsInput = z.infer<typeof seasonsSchema>;
export type CreateListInput = z.input<typeof createListSchema>;
export type UpdateListInput = z.input<typeof updateListSchema>;
export type ListItemInput = z.infer<typeof listItemSchema>;
export type AddTitleToListInput = z.infer<typeof addTitleToListSchema>;
export type LibraryParams = z.infer<typeof libraryParamsSchema>;

export const LIBRARY_DEFAULTS: LibraryParams = {
  type: 'all',
  status: 'all',
  sort: 'added',
  view: 'grid',
  q: '',
  list: '',
  provider: '',
};

/** /library URL with only the non-default values. */
export function libraryHref(params: LibraryParams, changes: Partial<LibraryParams> = {}) {
  const next = { ...params, ...changes };
  const search = new URLSearchParams();
  for (const key of Object.keys(LIBRARY_DEFAULTS) as (keyof LibraryParams)[]) {
    if (next[key] !== LIBRARY_DEFAULTS[key]) search.set(key, next[key]);
  }
  return search.size ? `/library?${search}` : '/library';
}
