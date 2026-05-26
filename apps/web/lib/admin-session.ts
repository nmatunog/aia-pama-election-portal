import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './env';

export type ElecomSession = {
  email: string;
  role: 'elecom';
  viaMemberLogin?: boolean;
  /** Env superuser or dedicated ELECOM login — may grant ELECOM to others */
  isSuperuser?: boolean;
};

async function elecomFromPayload(
  payload: Record<string, unknown>,
): Promise<ElecomSession | null> {
  if (payload.role === 'elecom' && typeof payload.email === 'string') {
    return {
      email: payload.email,
      role: 'elecom',
      viaMemberLogin: false,
      isSuperuser: true,
    };
  }
  if (payload.elecom === true) {
    const email =
      typeof payload.email === 'string'
        ? payload.email
        : 'superuser@member.session';
    return {
      email,
      role: 'elecom',
      viaMemberLogin: true,
      isSuperuser: payload.superuser === true,
    };
  }
  return null;
}

export async function getElecomSession(): Promise<ElecomSession | null> {
  const secret = getJwtSecret();
  if (!secret) return null;

  const cookieStore = await cookies();
  const encoder = new TextEncoder().encode(secret);

  const adminToken = cookieStore.get('aia_admin_session')?.value;
  if (adminToken) {
    try {
      const { payload } = await jwtVerify(adminToken, encoder);
      return elecomFromPayload(payload as Record<string, unknown>);
    } catch {
      /* try member session */
    }
  }

  const memberToken = cookieStore.get('aia_session')?.value;
  if (memberToken) {
    try {
      const { payload } = await jwtVerify(memberToken, encoder);
      const session = await elecomFromPayload(payload as Record<string, unknown>);
      if (session?.viaMemberLogin) return session;
    } catch {
      return null;
    }
  }

  return null;
}

function readSessionCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Bearer token for Worker admin routes (admin cookie or ELECOM member cookie). */
export async function getElecomBearerToken(request?: Request): Promise<string | null> {
  const cookieStore = await cookies();
  const fromStore =
    cookieStore.get('aia_admin_session')?.value ??
    cookieStore.get('aia_session')?.value;
  if (fromStore) return fromStore;

  if (!request) return null;
  const header = request.headers.get('cookie');
  return (
    readSessionCookie(header, 'aia_admin_session') ??
    readSessionCookie(header, 'aia_session')
  );
}
