'use server';

import { revalidatePath } from 'next/cache';

import { addToLibrary, type ActionResult } from '@/actions/library';
import { getCurrentUser } from '@/lib/auth/session';
import type { ListInfo } from '@/lib/library/lists';
import { createClient } from '@/lib/supabase/server';
import {
  addTitleToListSchema,
  createListSchema,
  listItemSchema,
  updateListSchema,
  type AddTitleToListInput,
  type CreateListInput,
  type ListItemInput,
  type UpdateListInput,
} from '@/lib/validation/library';

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const MESSAGES = {
  session: 'La sessione è scaduta. Ricarica la pagina e accedi di nuovo.',
  invalid: 'Richiesta non valida.',
  duplicate: 'Hai già una lista con questo nome.',
  notFound: 'Lista non trovata.',
  save: 'Non è stato possibile salvare. Riprova.',
};

function revalidateLists(mediaItemId?: string) {
  revalidatePath('/library');
  revalidatePath('/library/lists');
  if (mediaItemId) revalidatePath(`/item/${mediaItemId}`);
}

export async function createList(input: CreateListInput): Promise<ActionResult<ListInfo>> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = createListSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? MESSAGES.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lists')
    .insert(parsed.data)
    .select('id, name, description')
    .single();

  if (error) {
    if (error.code !== '23505') console.error('createList failed', { code: error.code });
    return fail(error.code === '23505' ? MESSAGES.duplicate : MESSAGES.save);
  }
  revalidateLists();
  return { ok: true, data };
}

export async function updateList(input: UpdateListInput): Promise<ActionResult<ListInfo>> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = updateListSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? MESSAGES.invalid);

  const { listId, ...values } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lists')
    .update(values)
    .eq('id', listId)
    .select('id, name, description')
    .maybeSingle();

  if (error) {
    if (error.code !== '23505') console.error('updateList failed', { code: error.code });
    return fail(error.code === '23505' ? MESSAGES.duplicate : MESSAGES.save);
  }
  if (!data) return fail(MESSAGES.notFound);
  revalidateLists();
  return { ok: true, data };
}

/** Deletes the list only: its titles stay in the library. */
export async function deleteList(listId: string): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = updateListSchema.shape.listId.safeParse(listId);
  if (!parsed.success) return fail(MESSAGES.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase.from('lists').delete().eq('id', parsed.data).select('id');

  if (error) return fail(MESSAGES.save);
  if (data.length === 0) return fail(MESSAGES.notFound);
  revalidateLists();
  return { ok: true, data: undefined };
}

/** Adds (or removes) a library entry to (from) a list. Adding twice is not an error. */
export async function setListMembership(
  input: ListItemInput & { member: boolean },
): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail(MESSAGES.session);

  const parsed = listItemSchema.safeParse(input);
  if (!parsed.success || typeof input.member !== 'boolean') return fail(MESSAGES.invalid);
  const { listId, entryId } = parsed.data;

  const supabase = await createClient();
  const { error } = input.member
    ? await supabase
        .from('list_items')
        .upsert(
          { list_id: listId, entry_id: entryId },
          { onConflict: 'list_id,entry_id', ignoreDuplicates: true },
        )
    : await supabase.from('list_items').delete().eq('list_id', listId).eq('entry_id', entryId);

  if (error) {
    // RLS rejects lists or entries that aren't the user's own.
    console.error('setListMembership failed', { code: error.code });
    return fail(error.code === '42501' ? MESSAGES.notFound : MESSAGES.save);
  }

  const { data: entry } = await supabase
    .from('user_entries')
    .select('media_item_id')
    .eq('id', entryId)
    .maybeSingle();
  revalidateLists(entry?.media_item_id);
  return { ok: true, data: undefined };
}

/**
 * A title from the preview, not necessarily in the library: it's added as planned
 * ("Da vedere"/"Da leggere") first, then put in the list. Returns its media item id.
 */
export async function addTitleToList(
  input: AddTitleToListInput,
): Promise<ActionResult<{ mediaItemId: string }>> {
  const parsed = addTitleToListSchema.safeParse(input);
  if (!parsed.success) return fail(MESSAGES.invalid);
  const { listId, ...title } = parsed.data;

  const added = await addToLibrary({ ...title, status: 'planned' });
  if (!added.ok) return added;

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from('user_entries')
    .select('id')
    .eq('media_item_id', added.data.mediaItemId)
    .maybeSingle();
  if (!entry) return fail(MESSAGES.save);

  const result = await setListMembership({ listId, entryId: entry.id, member: true });
  return result.ok ? { ok: true, data: { mediaItemId: added.data.mediaItemId } } : result;
}
