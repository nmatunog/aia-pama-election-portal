import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { workerFetch } from '@/lib/worker-api';

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
  const zoneParam = searchParams.get('zone');

  if (type === 'zonal' && zoneParam && zoneParam !== session.zone) {
    return NextResponse.json(
      { ok: false, error: 'You may only search members in your zone.' },
      { status: 403 },
    );
  }

  const qs = new URLSearchParams();
  qs.set('type', type);
  const q = searchParams.get('q');
  if (q) qs.set('q', q);
  if (zoneParam) qs.set('zone', zoneParam);

  try {
    const res = await workerFetch(`/nominations/members/search?${qs.toString()}`, {}, request);
    const data = (await res.json()) as { ok?: boolean; members?: unknown[]; error?: string };

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.error ?? 'Could not load member roster.',
        },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Member search failed';
    console.error('members/search:', message);
    return NextResponse.json(
      {
        ok: false,
        error:
          'Could not reach the election API. Check NEXT_PUBLIC_API_URL on Vercel (or .env.local locally).',
      },
      { status: 502 },
    );
  }
}
