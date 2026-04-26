import type { MiddlewareHandler } from 'hono';
import { config } from '../config.js';

type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

export function rateLimit(): MiddlewareHandler {
  return async (c, next) => {
    const ip = clientIp(c.req.raw.headers);
    const route = new URL(c.req.url).pathname.split('/').slice(0, 4).join('/');
    const key = `${ip}:${route}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { tokens: config.rateLimitPerMin - 1, resetAt: now + 60_000 });
    } else if (bucket.tokens <= 0) {
      return c.text('rate limit exceeded', 429, {
        'retry-after': String(Math.ceil((bucket.resetAt - now) / 1000)),
      });
    } else {
      bucket.tokens -= 1;
    }
    await next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();
