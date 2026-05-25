import { NextResponse } from 'next/server';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function GET() {
  const res = await fetch(`${WORKER_URL}/public/candidates`, {
    next: { revalidate: 30 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
