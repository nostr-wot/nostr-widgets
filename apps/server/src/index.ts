import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { config } from './config.js';
import { rateLimit } from './middleware/rate-limit.js';
import { requestLog } from './middleware/request-log.js';
import { feedRoute } from './routes/feed.js';
import { followRoute } from './routes/follow.js';
import { profileRoute } from './routes/profile.js';
import { shutdownRelays, warmRelayPool } from './relays.js';

const app = new Hono();

app.use('*', requestLog());
app.use('/widgets/*', rateLimit());

app.get('/health', (c) => c.json({ status: 'ok', relays: config.relays.length }));

app.route('/widgets/profile', profileRoute);
app.route('/widgets/follow', followRoute);
app.route('/widgets/feed', feedRoute);

app.notFound((c) => c.text('not found', 404));
app.onError((err, c) => {
  process.stderr.write(`error: ${err.message}\n${err.stack ?? ''}\n`);
  return c.text('internal error', 500);
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  process.stdout.write(`nostr-widgets listening on :${info.port}\n`);
  void warmRelayPool();
});

function shutdown(signal: string): void {
  process.stdout.write(`received ${signal}, shutting down\n`);
  server.close(() => {
    shutdownRelays();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
