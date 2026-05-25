import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './env';

export type ElecomSession = {
  email: string;
  role: 'elecom';
  viaMemberLogin?: boolean;
};

async function elecomFromPayload(
  payload: Record<string, unknown>,
): Promise<ElecomSession | null> {
  if (payload.role === 'elecom' && typeof payload.email === 'string') {
    return { email: payload.email, role: 'elecom', viaMemberLogin: false };
  }
  if (payload.elecom === true) {
    const email =
      typeof payload.email === 'string'
        ? payload.email
        : 'superuser@member.session';
    return { email, role: 'elecom', viaMemberLogin: true };
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

/** Bearer token for Worker admin routes (admin cookie or superuser member cookie). */
export async function getElecomBearerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return (
    cookieStore.get('aia_admin_session')?.value ??
    cookieStore.get('aia_session')?.value ??
    null
  );
}
