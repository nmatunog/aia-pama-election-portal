import { adminWorkerFetch } from '@/lib/admin-worker-api';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const res = await adminWorkerFetch('/admin/login-secret', {}, request);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const res = await adminWorkerFetch(
    '/admin/login-secret',
    { method: 'PATCH', body: JSON.stringify(body) },
    request,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
