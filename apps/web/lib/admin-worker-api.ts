import { getElecomBearerToken } from './admin-session';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function adminWorkerFetch(
  path: string,
  init: RequestInit = {},
  request?: Request,
): Promise<Response> {
  const token = await getElecomBearerToken(request);
  if (!token) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Session expired. Sign in again.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${WORKER_URL}${path}`, { ...init, headers });
}
