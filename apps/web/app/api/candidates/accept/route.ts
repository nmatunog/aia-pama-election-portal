import { NextResponse } from 'next/server';
import { workerFetch } from '@/lib/worker-api';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await workerFetch('/candidates/accept', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
