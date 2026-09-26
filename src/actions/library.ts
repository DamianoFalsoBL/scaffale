'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth/session';
import type { LibraryRef } from '@/lib/library/matching';
import { parseExtra } from '@/lib/library/extra';
import { applyStatusDefaults, asRecord, todayIso, type EntryProgress } from '@/lib/library/model';
import { upsertMediaItem } from '@/lib/library/queries';
import { statusAfterWatching, summarizeSeasons } from '@/lib/library/seasons';
import { getDetails } from '@/lib/providers';
import { isStatusAllowed, type EntryStatus } from '@/lib/status-labels';
import { createClient } from '@/lib/supabase/server';
import {
  addEntrySchema,
  seasonsSchema,
  statusChangeSchema,
  updateEntrySchema,
  type AddEntryInput,
  type SeasonsInput,
  type UpdateEntryInput,
} from '@/lib/validation/library';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const MESSAGES = {
  session: 'La sessione è scaduta. Ricarica la pagina e accedi di nuovo.',
  invalid: 'Richiesta non valida.',
  status: 'Questo stato non è disponibile per questo tipo di titolo.',
  notFound: 'Titolo non trovato nella tua libreria.',
  save: 'Non è stato possibile salvare. Riprova.',
};

function revalidateLibrary(mediaItemId?: string) {
  revalidatePath('/library');
  revalidatePath('/dashboard');
  if (mediaItemId) revalidatePath(`/item/${mediaItemId}`);
}

export async function addToLibrary(input: AddEntryInput): Promise<ActionResult<LibraryRef>> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = addEntrySchema.safeParse(input);
  if (!parsed.success) return fail(MESSAGES.invalid);

  const { source, externalId, mediaType, status } = parsed.data;
  if (!isStatusAllowed(mediaType, status)) return fail(MESSAGES.status);

  // Metadata always comes from the provider, never from the client.
  let mediaItemId: string;
  try {
    const media = await getDetails(source, externalId, mediaType);
    if (media.mediaType !== mediaType) return fail(MESSAGES.invalid);
    mediaItemId = await upsertMediaItem(media);
  } catch (error) {
    console.error('addToLibrary: catalog step failed', { source, externalId, error });
    return fail('Non è stato possibile recuperare i dati del titolo. Riprova tra poco.');
  }

  const supabase = await createClient();
  const progress = applyStatusDefaults(
    { status, startedAt: null, finishedAt: null, timesCompleted: 0 },
    undefined,
    todayIso(),
  );
  const { data, error } = await supabase
    .from('user_entries')
    .insert({
      media_item_id: mediaItemId,
      status: progress.status,
      started_at: progress.startedAt,
      finished_at: progress.finishedAt,
      times_completed: progress.timesCompleted,
    })
    .select('status')
    .single();

  if (error?.code === '23505') {
    // Already in the library (e.g. same book from another source): report the current state.
    const { data: existing } = await supabase
      .from('user_entries')
      .select('status')
      .eq('media_item_id', mediaItemId)
      .single();
    return existing
      ? { ok: true, data: { mediaItemId, status: existing.status } }
      : fail(MESSAGES.save);
  }
  if (error) {
    console.error('addToLibrary: insert failed', { code: error.code });
    return fail(MESSAGES.save);
  }

  revalidateLibrary(mediaItemId);
  return { ok: true, data: { mediaItemId, status: data.status } };
}

type SavedEntry = EntryProgress & {
  rating: number | null;
  notes: string | null;
};

/** Current values needed to validate a change: media type and previous status. */
async function loadEntry(entryId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_entries')
    .select(
      'status, started_at, finished_at, times_completed, media_item_id, media_items!inner(media_type)',
    )
    .eq('id', entryId)
    .maybeSingle();
  return { supabase, entry: data };
}

async function saveEntry(
  entryId: string,
  values: {
    status: EntryStatus;
    rating?: number | null;
    notes?: string | null;
  } & Partial<EntryProgress>,
): Promise<ActionResult<SavedEntry>> {
  const { supabase, entry } = await loadEntry(entryId);
  if (!entry) return fail(MESSAGES.notFound);
  if (!isStatusAllowed(entry.media_items.media_type, values.status)) return fail(MESSAGES.status);

  const progress = applyStatusDefaults(
    {
      status: values.status,
      startedAt: values.startedAt !== undefined ? values.startedAt : entry.started_at,
      finishedAt: values.finishedAt !== undefined ? values.finishedAt : entry.finished_at,
      timesCompleted: values.timesCompleted ?? entry.times_completed,
    },
    entry.status,
    todayIso(),
  );

  if (progress.startedAt && progress.finishedAt && progress.finishedAt < progress.startedAt) {
    return fail('La data di fine non può precedere quella di inizio.');
  }

  const { data, error } = await supabase
    .from('user_entries')
    .update({
      status: progress.status,
      started_at: progress.startedAt,
      finished_at: progress.finishedAt,
      times_completed: progress.timesCompleted,
      ...(values.rating !== undefined && { rating: values.rating }),
      ...(values.notes !== undefined && { notes: values.notes }),
    })
    .eq('id', entryId)
    .select('status, started_at, finished_at, times_completed, rating, notes')
    .single();

  if (error) {
    console.error('saveEntry failed', { code: error.code });
    return fail(error.code === '23514' ? MESSAGES.status : MESSAGES.save);
  }

  revalidateLibrary(entry.media_item_id);
  return {
    ok: true,
    data: {
      status: data.status,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      timesCompleted: data.times_completed,
      rating: data.rating,
      notes: data.notes,
    },
  };
}

export async function changeEntryStatus(input: {
  entryId: string;
  status: EntryStatus;
}): Promise<ActionResult<SavedEntry>> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return fail(MESSAGES.invalid);

  return saveEntry(parsed.data.entryId, { status: parsed.data.status });
}

export async function updateEntry(input: UpdateEntryInput): Promise<ActionResult<SavedEntry>> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? MESSAGES.invalid);

  const { entryId, ...values } = parsed.data;
  return saveEntry(entryId, values);
}

export async function removeEntry(entryId: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = statusChangeSchema.shape.entryId.safeParse(entryId);
  if (!parsed.success) return fail(MESSAGES.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_entries')
    .delete()
    .eq('id', parsed.data)
    .select('media_item_id');

  if (error) return fail(MESSAGES.save);
  if (data.length === 0) return fail(MESSAGES.notFound);

  revalidateLibrary(data[0]?.media_item_id);
  return { ok: true, data: undefined };
}

export type SeasonsResult = { watchedSeasons: number[]; status: EntryStatus };

/**
 * Marks seasons of a series as seen (or not) and, when adding, moves the status on:
 * see statusAfterWatching (first season → in progress; all seen and ended → completed).
 */
export async function setSeasonsWatched(input: SeasonsInput): Promise<ActionResult<SeasonsResult>> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = seasonsSchema.safeParse(input);
  if (!parsed.success) return fail(MESSAGES.invalid);
  const { entryId, seasons, watched } = parsed.data;

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from('user_entries')
    .select(
      'status, media_item_id, media_items!inner(media_type, extra), season_progress(season_number)',
    )
    .eq('id', entryId)
    .maybeSingle();
  if (!entry) return fail(MESSAGES.notFound);
  if (entry.media_items.media_type !== 'tv') return fail(MESSAGES.invalid);

  const today = todayIso();
  const { error } = watched
    ? await supabase.from('season_progress').upsert(
        seasons.map((season) => ({ entry_id: entryId, season_number: season, watched_on: today })),
        { onConflict: 'entry_id,season_number', ignoreDuplicates: true },
      )
    : await supabase
        .from('season_progress')
        .delete()
        .eq('entry_id', entryId)
        .in('season_number', seasons);
  if (error) {
    console.error('setSeasonsWatched failed', { code: error.code });
    return fail(MESSAGES.save);
  }

  const seen = new Set(entry.season_progress.map((row) => row.season_number));
  for (const season of seasons) {
    if (watched) seen.add(season);
    else seen.delete(season);
  }
  const watchedSeasons = [...seen].sort((a, b) => a - b);

  let status = entry.status;
  if (watched) {
    const parsedExtra = parseExtra('tv', asRecord(entry.media_items.extra));
    if (parsedExtra.mediaType === 'tv') {
      const summary = summarizeSeasons(parsedExtra.extra, watchedSeasons, today);
      const next = statusAfterWatching(entry.status, summary, parsedExtra.extra.status);
      if (next !== entry.status) {
        const saved = await saveEntry(entryId, { status: next });
        if (saved.ok) status = saved.data.status;
      }
    }
  }

  revalidateLibrary(entry.media_item_id);
  return { ok: true, data: { watchedSeasons, status } };
}
