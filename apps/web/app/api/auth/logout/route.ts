import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('aia_session');
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  );
  response.cookies.delete('aia_session');
  return response;
}
