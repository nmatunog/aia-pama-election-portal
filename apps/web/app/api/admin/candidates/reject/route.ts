import { NextResponse } from 'next/server';
import { adminWorkerFetch } from '@/lib/admin-worker-api';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await adminWorkerFetch('/admin/candidates/reject', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
