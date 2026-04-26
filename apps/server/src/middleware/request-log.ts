import type { MiddlewareHandler } from 'hono';

export function requestLog(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    const path = new URL(c.req.url).pathname;
    const status = c.res.status;
    process.stdout.write(`${new Date().toISOString()} ${c.req.method} ${path} ${status} ${ms}ms\n`);
  };
}
