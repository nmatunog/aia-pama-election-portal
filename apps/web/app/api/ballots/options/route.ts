import { NextResponse } from 'next/server';
import { workerFetch } from '@/lib/worker-api';

export async function GET(request: Request) {
  const res = await workerFetch('/ballots/options', {}, request);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
