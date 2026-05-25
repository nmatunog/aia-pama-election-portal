import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './env';

export type SessionMember = {
  id: string;
  fullName: string;
  zone: string;
  isElecom?: boolean;
};

export async function getSession(): Promise<SessionMember | null> {
  const secret = getJwtSecret();
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get('aia_session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    if (!payload.sub || typeof payload.name !== 'string') return null;
    return {
      id: payload.sub,
      fullName: payload.name,
      zone: String(payload.zone),
      isElecom: payload.elecom === true,
    };
  } catch {
    return null;
  }
}
