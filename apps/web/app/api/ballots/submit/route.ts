import { NextResponse } from 'next/server';
import { workerFetch } from '@/lib/worker-api';

export async function POST(request: Request) {
  const body = await request.text();
  const res = await workerFetch('/ballots/submit', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  }, request);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
