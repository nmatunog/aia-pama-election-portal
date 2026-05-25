import { SignJWT, jwtVerify } from 'jose';

export type VoterClaims = {
  sub: string;
  name: string;
  zone: string;
  licenseHash: string;
};

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signVoterToken(
  claims: VoterClaims,
  secret: string,
): Promise<string> {
  return new SignJWT({
    name: claims.name,
    zone: claims.zone,
    licenseHash: claims.licenseHash,
  })
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
    };
  } catch {
    return null;
  }
}
