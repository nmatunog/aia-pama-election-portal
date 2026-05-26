import { NextResponse } from 'next/server';
import { adminWorkerFetch } from '@/lib/admin-worker-api';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const perZone = url.searchParams.get('perZone') ?? '15';
  const res = await adminWorkerFetch(
    `/admin/members/import-dev-template?perZone=${encodeURIComponent(perZone)}`,
    { method: 'POST' },
    request,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
