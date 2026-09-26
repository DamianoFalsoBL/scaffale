import type { NextRequest } from 'next/server';

import { isAuthorizedCron } from '@/lib/cron/auth';
import { refreshStaleItems } from '@/lib/cron/refresh';
import { serverEnv } from '@/lib/env.server';
import { toMediaItemRow } from '@/lib/library/model';
import { getDetails } from '@/lib/providers';
import { createAdminClient } from '@/lib/supabase/admin';

// A batch of 25 items with pauses fits comfortably in a minute.
export const maxDuration = 60;

/**
 * Daily refresh of catalog snapshots older than 150 days, so no TMDB data is kept
 * longer than the 6 months allowed by its terms.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), serverEnv.CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createAdminClient();

  const summary = await refreshStaleItems({
    loadStale: async (cutoff, limit) => {
      const { data, error } = await admin
        .from('media_items')
        .select('id, source, external_id, media_type')
        .lt('last_synced_at', cutoff)
        .order('last_synced_at', { ascending: true })
        .limit(limit);

      if (error) throw new Error(`Could not load stale items: ${error.message}`);
      return data.map((row) => ({
        id: row.id,
        source: row.source,
        externalId: row.external_id,
        mediaType: row.media_type,
      }));
    },
    fetchDetails: (item) => getDetails(item.source, item.externalId, item.mediaType),
    save: async (id, media) => {
      const { error } = await admin.from('media_items').update(toMediaItemRow(media)).eq('id', id);
      if (error) throw new Error(`Could not save ${id}: ${error.message}`);
    },
  });

  if (summary.failed.length > 0) {
    console.error('cron refresh: some items failed', summary.failed);
  }
  console.info('cron refresh done', {
    checked: summary.checked,
    refreshed: summary.refreshed,
    failed: summary.failed.length,
  });

  return Response.json(summary);
}
