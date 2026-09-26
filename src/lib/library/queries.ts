import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { NormalizedMedia } from '@/lib/providers/types';

import { sortLists, type ListInfo } from './lists';
import type { LibraryIndexRow } from './matching';
import { LIBRARY_SELECT, toLibraryEntry, toMediaItemRow, type LibraryEntry } from './model';

// A personal library stays well below this; filtering and sorting happen in memory.
const MAX_ENTRIES = 5000;

/** All entries of the signed-in user (RLS), newest first. */
export async function getLibrary(): Promise<LibraryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_entries')
    .select(LIBRARY_SELECT)
    .order('created_at', { ascending: false })
    .limit(MAX_ENTRIES);

  if (error) {
    throw new Error('Could not load the library', { cause: error });
  }
  return data.map(toLibraryEntry);
}

export async function getEntryByMediaItem(mediaItemId: string): Promise<LibraryEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_entries')
    .select(LIBRARY_SELECT)
    .eq('media_item_id', mediaItemId)
    .maybeSingle();

  if (error) {
    throw new Error('Could not load the entry', { cause: error });
  }
  return data ? toLibraryEntry(data) : null;
}

/** Minimal view of the library used to mark search results. */
export async function getLibraryIndex(): Promise<LibraryIndexRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_entries')
    .select('media_item_id, status, media_items!inner(source, external_id, isbn13)')
    .limit(MAX_ENTRIES);

  if (error) {
    throw new Error('Could not load the library index', { cause: error });
  }
  return data.map((row) => ({
    mediaItemId: row.media_item_id,
    status: row.status,
    source: row.media_items.source,
    externalId: row.media_items.external_id,
    isbn13: row.media_items.isbn13,
  }));
}

/**
 * Saves the catalog snapshot with the secret key (users can only read media_items)
 * and returns its id. A book already in the catalog with the same ISBN-13 is reused,
 * even if it came from another source.
 */
export async function upsertMediaItem(media: NormalizedMedia): Promise<string> {
  const admin = createAdminClient();
  const row = toMediaItemRow(media);

  const findByIsbn = async () => {
    if (!row.isbn13) return null;
    const { data } = await admin
      .from('media_items')
      .select('id')
      .eq('isbn13', row.isbn13)
      .maybeSingle();
    return data?.id ?? null;
  };

  const existing = await findByIsbn();
  if (existing) {
    return existing;
  }

  const { data, error } = await admin
    .from('media_items')
    .upsert(row, { onConflict: 'source,external_id' })
    .select('id')
    .single();

  if (error) {
    // Another request saved the same ISBN in the meantime.
    const raced = error.code === '23505' ? await findByIsbn() : null;
    if (raced) return raced;
    throw new Error('Could not save the catalog item', { cause: error });
  }
  return data.id;
}

/** The signed-in user's lists (RLS), by name. Counts come from the library entries. */
export async function getLists(): Promise<ListInfo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('lists').select('id, name, description');

  if (error) {
    throw new Error('Could not load the lists', { cause: error });
  }
  return sortLists(data);
}
