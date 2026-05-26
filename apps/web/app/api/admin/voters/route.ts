import { NextResponse } from 'next/server';
import { adminWorkerFetch } from '@/lib/admin-worker-api';

export async function GET(request: Request) {
  const zone = new URL(request.url).searchParams.get('zone');
  const qs = zone ? `?zone=${encodeURIComponent(zone)}` : '';
  const res = await adminWorkerFetch(`/admin/voters${qs}`, {}, request);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
