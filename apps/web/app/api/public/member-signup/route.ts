import { NextResponse } from 'next/server';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${WORKER_URL}/public/member-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
