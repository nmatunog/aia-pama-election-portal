import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { authRoutes } from './routes/auth';
import { electionRoutes } from './routes/elections';
import { adminRoutes } from './routes/admin';
import { ballotRoutes } from './routes/ballots';
import { candidateRoutes } from './routes/candidates';
import { nominationRoutes } from './routes/nominations';
import { publicRoutes } from './routes/public';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
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
app.route('/candidates', candidateRoutes);
app.route('/admin', adminRoutes);
app.route('/ballots', ballotRoutes);
app.route('/public', publicRoutes);

app.notFound((c) => c.json({ ok: false, error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ ok: false, error: 'Internal server error' }, 500);
});

export default app;
