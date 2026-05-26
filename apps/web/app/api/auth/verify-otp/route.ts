import { NextResponse } from 'next/server';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const TIMEOUT_MS = 10_000;

export async function POST(request: Request) {
  const body = await request.json();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${WORKER_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      {
        ok: false,
        error: isAbort
          ? 'Election API is not responding. Run: npm run dev:api'
          : 'Could not reach the election API.',
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }

  const data = (await res.json()) as {
    ok: boolean;
    token?: string;
    member?: { fullName: string; zone: string; isElecom?: boolean };
    error?: string;
  };

  if (!data.ok || !data.token) {
    return NextResponse.json(data, { status: res.status });
  }

  const isElecom = data.member?.isElecom === true;
  const response = NextResponse.json({ ok: true, member: data.member });
  response.cookies.set('aia_session', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: isElecom ? 60 * 60 * 8 : 60 * 15,
    path: '/',
  });

  return response;
}
