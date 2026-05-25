import { getElecomBearerToken } from './admin-session';

const WORKER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function adminWorkerFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getElecomBearerToken();
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${WORKER_URL}${path}`, { ...init, headers });
}
