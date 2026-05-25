import { NextResponse } from 'next/server';
import { workerFetch } from '@/lib/worker-api';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await workerFetch(
    '/nominations/national',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    request,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
