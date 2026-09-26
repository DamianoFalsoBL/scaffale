import type { NextRequest } from 'next/server';

import { isAuthorizedCron } from '@/lib/cron/auth';
import { serverEnv } from '@/lib/env.server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Daily lightweight query: free Supabase projects pause after 7 days without activity.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), serverEnv.CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { count, error } = await createAdminClient()
    .from('media_items')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('cron keepalive failed', { code: error.code, message: error.message });
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true, catalogItems: count });
}
