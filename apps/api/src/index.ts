import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { authRoutes } from './routes/auth';
import { electionRoutes } from './routes/elections';
import { nominationRoutes } from './routes/nominations';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'aia-pama-election-api',
    environment: c.env.ENVIRONMENT,
  });
});

app.route('/auth', authRoutes);
app.route('/elections', electionRoutes);
app.route('/nominations', nominationRoutes);

app.post('/ballots/submit', async (c) => {
  return c.json(
    { ok: false, error: 'Ballot submission not yet implemented' },
    501,
  );
});

app.notFound((c) => c.json({ ok: false, error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ ok: false, error: 'Internal server error' }, 500);
});

export default app;
