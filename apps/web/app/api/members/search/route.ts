import { NextResponse } from 'next/server';
import { searchMembersServer } from '@/lib/members-search-server';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: 'Please sign in again to search members.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'zonal';
  const q = searchParams.get('q') ?? '';
  const zoneParam = searchParams.get('zone');

  if (type === 'zonal' && zoneParam && zoneParam !== session.zone) {
    return NextResponse.json(
      { ok: false, error: 'You may only search members in your zone.' },
      { status: 403 },
    );
  }

  const zone = type === 'zonal' ? session.zone : zoneParam || undefined;

  try {
    const members = await searchMembersServer({
      zone: zone || undefined,
      query: q,
      limit: 25,
    });

    return NextResponse.json({ ok: true, members });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Member search failed';
    console.error('members/search:', message);
    return NextResponse.json(
      {
        ok: false,
        error:
          'Server cannot load the member roster. Restart npm run dev after updating apps/web/.env.local.',
      },
      { status: 500 },
    );
  }
}
