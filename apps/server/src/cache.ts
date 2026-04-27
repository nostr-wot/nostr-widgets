import { LRUCache } from 'lru-cache';

const TTLS = {
  profile: 5 * 60_000,
  follow: 5 * 60_000,
  feed: 60_000,
  avatar: 30 * 60_000,
  wot: 5 * 60_000,
} as const;

type Bucket = keyof typeof TTLS;
type Wrapped = { v: unknown };

const caches = new Map<Bucket, LRUCache<string, Wrapped>>([
  ['profile', new LRUCache<string, Wrapped>({ max: 5000, ttl: TTLS.profile })],
  ['follow', new LRUCache<string, Wrapped>({ max: 5000, ttl: TTLS.follow })],
  ['feed', new LRUCache<string, Wrapped>({ max: 2000, ttl: TTLS.feed })],
  ['avatar', new LRUCache<string, Wrapped>({ max: 2000, ttl: TTLS.avatar })],
  ['wot', new LRUCache<string, Wrapped>({ max: 5000, ttl: TTLS.wot })],
]);

function isNegative(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

const inflight = new Map<string, Promise<unknown>>();

export async function memoize<T>(
  bucket: Bucket,
  key: string,
  fn: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const cache = caches.get(bucket);
  if (!cache) throw new Error(`unknown cache bucket: ${bucket}`);

  const cached = cache.get(key);
  if (cached) return { value: cached.v as T, hit: true };

  const flightKey = `${bucket}:${key}`;
  const existing = inflight.get(flightKey) as Promise<T> | undefined;
  if (existing) {
    return { value: await existing, hit: true };
  }

  const promise = (async () => {
    const fresh = await fn();
    if (!isNegative(fresh)) cache.set(key, { v: fresh });
    return fresh;
  })();
  inflight.set(flightKey, promise);
  try {
    const value = await promise;
    return { value, hit: false };
  } finally {
    inflight.delete(flightKey);
  }
}

export const cacheTtls = TTLS;
