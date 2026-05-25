import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { resolveElecomAccess } from '../lib/elecom-auth-config';
import type { ElecomClaims } from '../lib/jwt';

export type ElecomVariables = {
  elecom: ElecomClaims;
};

export const requireElecom = createMiddleware<{ Bindings: Env; Variables: ElecomVariables }>(
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

    const elecom = await resolveElecomAccess(token, secret);
    if (!elecom) {
      return c.json({ ok: false, error: 'Invalid or expired admin session' }, 401);
    }

    c.set('elecom', elecom);
    await next();
  },
);
