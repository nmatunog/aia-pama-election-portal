import { NextResponse } from 'next/server';
import { adminWorkerFetch } from '@/lib/admin-worker-api';

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get('status') ?? 'all';
  const res = await adminWorkerFetch(
    `/admin/candidates?status=${encodeURIComponent(status)}`,
    {},
    request,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
