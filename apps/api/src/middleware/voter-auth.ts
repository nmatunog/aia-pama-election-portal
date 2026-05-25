import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { verifyVoterToken, type VoterClaims } from '../lib/jwt';

export type VoterVariables = {
  voter: VoterClaims;
};

export const requireVoter = createMiddleware<{ Bindings: Env; Variables: VoterVariables }>(
  async (c, next) => {
    const secret = c.env.JWT_SECRET;
    if (!secret) {
      return c.json({ ok: false, error: 'Server misconfigured' }, 500);
    }

    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '') ?? '';
    if (!token) {
      return c.json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const voter = await verifyVoterToken(token, secret);
    if (!voter) {
      return c.json({ ok: false, error: 'Invalid or expired session' }, 401);
    }

    c.set('voter', voter);
    await next();
  },
);
