import { NextResponse } from 'next/server';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const TIMEOUT_MS = 10_000;

export async function POST(request: Request) {
  const body = await request.json();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${WORKER_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      {
        ok: false,
        error: isAbort
          ? 'Election API is not responding. In a second terminal, run: npm run dev:api'
          : 'Could not reach the election API. Make sure npm run dev:api is running on port 8787.',
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
