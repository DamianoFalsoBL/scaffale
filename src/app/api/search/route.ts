import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { search } from '@/lib/providers';
import { SearchUnavailableError } from '@/lib/providers/search';
import { searchQuerySchema } from '@/lib/validation/search';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  // Keeps our API quotas for signed-in users only.
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const parsed = searchQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400, headers: NO_STORE });
  }

  const { q, type, page } = parsed.data;

  try {
    const result = await search(q, type, page);
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error('Search failed', {
      error: error instanceof SearchUnavailableError ? error.cause : error,
    });
    return NextResponse.json({ error: 'unavailable' }, { status: 502, headers: NO_STORE });
  }
}
