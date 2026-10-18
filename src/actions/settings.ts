'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth/session';
import type { WatchProviderSlug } from '@/lib/catalogs';
import { createClient } from '@/lib/supabase/server';
import { streamingProvidersSchema } from '@/lib/validation/library';

import type { ActionResult } from './library';

/** Saves the streaming services the user subscribes to ("Le mie piattaforme"). */
export async function saveStreamingProviders(
  providers: string[],
): Promise<ActionResult<{ streamingProviders: WatchProviderSlug[] }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'La sessione è scaduta. Ricarica la pagina e accedi di nuovo.' };
  }

  const parsed = streamingProvidersSchema.safeParse(providers);
  if (!parsed.success) return { ok: false, error: 'Richiesta non valida.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, streaming_providers: parsed.data }, { onConflict: 'user_id' });

  if (error) {
    console.error('saveStreamingProviders failed', { code: error.code });
    return { ok: false, error: 'Non è stato possibile salvare. Riprova.' };
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  revalidatePath('/library');
  return { ok: true, data: { streamingProviders: parsed.data } };
}
