import { Hono } from 'hono';
import { cors } from 'hono/cors';
import convertRoute from './routes/convert';
import { StructuredLogger } from './services/logger';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET'],
  allowHeaders: ['Content-Type', 'Content-Length', 'Authorization', 'X-Request-Id'],
  maxAge: 86400
}));

app.get('/', (c) => {
  return c.json({
    service: 'cf-markitdown',
    version: '1.0.0',
    description: 'CloudFlare Workers service for converting documents to Markdown'
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.route('/', convertRoute);

app.onError((err, c) => {
  const logger = new StructuredLogger();
  logger.error('Unhandled error', err as Error);

  return c.json({ error: 'Internal server error' }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
