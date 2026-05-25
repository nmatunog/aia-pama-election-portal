import { cookies } from 'next/headers';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('aia_session')?.value ?? null;
}

function tokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)aia_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function workerFetch(
  path: string,
  init: RequestInit = {},
  incomingRequest?: Request,
): Promise<Response> {
  let token = await getSessionToken();
  if (!token && incomingRequest) {
    token = tokenFromCookieHeader(incomingRequest.headers.get('cookie'));
  }

  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${WORKER_URL}${path}`, { ...init, headers });
}
