import { NextResponse } from 'next/server';
import { adminWorkerFetch } from '@/lib/admin-worker-api';

export async function PATCH(request: Request) {
  const body = await request.json();
  const res = await adminWorkerFetch(
    '/admin/election/phase',
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
    request,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
