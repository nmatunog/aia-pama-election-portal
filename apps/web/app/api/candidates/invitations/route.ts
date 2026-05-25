import { NextResponse } from 'next/server';
import { workerFetch } from '@/lib/worker-api';

export async function GET() {
  const res = await workerFetch('/candidates/invitations');
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
