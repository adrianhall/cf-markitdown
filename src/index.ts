import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import convertRoute from './routes/convert';
import { handleUnhandledError } from './utils/errorHandler';
import type { AppBindings } from './types/bindings';

const app = new Hono<{ Bindings: AppBindings }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET'],
  allowHeaders: ['Content-Type', 'Content-Length', 'Authorization', 'X-Request-Id'],
  maxAge: 86400
}));

app.get('/health', (c: Context<{ Bindings: AppBindings }>) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.route('/', convertRoute);

app.onError(handleUnhandledError);

export default app;
