import { createHash } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

type Bucket = 'profile' | 'follow' | 'feed';

const HEADERS: Record<Bucket, string> = {
  profile: 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
  follow: 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
  feed: 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400',
};

export function svgCacheHeaders(bucket: Bucket): MiddlewareHandler {
  return async (c, next) => {
    await next();
    const body = await c.res.clone().text();
    const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;
    const ifNoneMatch = c.req.header('if-none-match');
    if (ifNoneMatch === etag) {
      c.res = new Response(null, {
        status: 304,
        headers: {
          'cache-control': HEADERS[bucket],
          etag,
        },
      });
      return;
    }
    c.res.headers.set('cache-control', HEADERS[bucket]);
    c.res.headers.set('etag', etag);
    c.res.headers.set('content-type', 'image/svg+xml; charset=utf-8');
    c.res.headers.set('x-content-type-options', 'nosniff');
  };
}
