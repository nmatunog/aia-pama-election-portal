import { NextResponse } from 'next/server';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${WORKER_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    ok: boolean;
    token?: string;
    admin?: { email: string };
    error?: string;
  };

  if (!data.ok || !data.token) {
    return NextResponse.json(data, { status: res.status });
  }

  const response = NextResponse.json({ ok: true, admin: data.admin });
  response.cookies.set('aia_admin_session', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return response;
}
