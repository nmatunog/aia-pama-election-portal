import { SignJWT, jwtVerify } from 'jose';

export type VoterClaims = {
  sub: string;
  name: string;
  zone: string;
  licenseHash: string;
  /** Member session with ELECOM superuser privileges */
  elecom?: boolean;
  email?: string;
};

export type ElecomClaims = {
  sub: string;
  email: string;
  role: 'elecom';
};

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signVoterToken(
  claims: VoterClaims,
  secret: string,
): Promise<string> {
  const payload: Record<string, string | boolean> = {
    name: claims.name,
    zone: claims.zone,
    licenseHash: claims.licenseHash,
  };
  if (claims.elecom) {
    payload.elecom = true;
    if (claims.email) payload.email = claims.email;
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey(secret));
}

export async function verifyVoterToken(
  token: string,
  secret: string,
): Promise<VoterClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if (!payload.sub || typeof payload.name !== 'string') return null;
    return {
      sub: payload.sub,
      name: payload.name,
      zone: String(payload.zone),
      licenseHash: String(payload.licenseHash),
      elecom: payload.elecom === true,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

/** True if token grants ELECOM access (dedicated admin or member superuser). */
export async function tokenHasElecomAccess(
  token: string,
  secret: string,
): Promise<boolean> {
  const elecom = await verifyElecomToken(token, secret);
  if (elecom) return true;
  const voter = await verifyVoterToken(token, secret);
  return voter?.elecom === true;
}

export async function signElecomToken(
  claims: ElecomClaims,
  secret: string,
): Promise<string> {
  return new SignJWT({ email: claims.email, role: 'elecom' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secretKey(secret));
}

export async function verifyElecomToken(
  token: string,
  secret: string,
): Promise<ElecomClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if (payload.role !== 'elecom' || !payload.sub || typeof payload.email !== 'string') {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: 'elecom',
    };
  } catch {
    return null;
  }
}
