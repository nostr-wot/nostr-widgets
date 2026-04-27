import { SimplePool, nip19, type Event, type Filter } from 'nostr-tools';
import { config } from './config.js';
import { memoize } from './cache.js';

export class InvalidNpubError extends Error {
  constructor(input: string) {
    super(`invalid npub: ${input.slice(0, 12)}…`);
    this.name = 'InvalidNpubError';
  }
}

let pool: SimplePool | null = null;
function getPool(): SimplePool {
  if (!pool) pool = new SimplePool();
  return pool;
}

export function npubToHex(npub: string): string {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type !== 'npub') throw new InvalidNpubError(npub);
    return decoded.data;
  } catch {
    throw new InvalidNpubError(npub);
  }
}

/**
 * Subscribe to all configured relays for `filter`. Resolve as soon as the
 * first event arrives from any relay, or when `relayTimeoutMs` expires
 * (whichever comes first). Subsequent events from slower relays are
 * dropped — the caller has already proceeded.
 *
 * For `limit > 1` we wait for either `limit` events or the timeout,
 * whichever first. This trades a little freshness (we may miss an event
 * that arrives 10ms after our first) for sub-second response times when
 * the cache is cold.
 */
function fastQuery(filter: Filter, limit = 1): Promise<Event[]> {
  return new Promise((resolve) => {
    const collected: Event[] = [];
    const seen = new Set<string>();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { sub.close(); } catch { /* ignore */ }
      resolve(collected);
    };

    const sub = getPool().subscribeMany(config.relays, filter, {
      onevent(event) {
        if (settled || seen.has(event.id)) return;
        seen.add(event.id);
        collected.push(event);
        if (collected.length >= limit) finish();
      },
      oneose() {
        // EOSE from a single relay isn't enough — others may still have events.
        // But if every relay EOSEd and we have nothing, finish at the timeout.
      },
    });

    setTimeout(finish, config.relayTimeoutMs);
  });
}

async function querySingle(filter: Filter): Promise<Event | null> {
  const events = await fastQuery(filter, 1);
  if (events.length === 0) return null;
  return events.reduce((newest, current) =>
    current.created_at > newest.created_at ? current : newest,
  );
}

async function queryMany(filter: Filter, limit: number): Promise<Event[]> {
  const events = await fastQuery({ ...filter, limit }, limit);
  return events.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
}

export type Metadata = {
  name?: string;
  display_name?: string;
  picture?: string;
  nip05?: string;
};

export async function fetchMetadata(hex: string): Promise<Metadata | null> {
  const { value } = await memoize('profile', `meta:${hex}`, async () => {
    const event = await querySingle({ kinds: [0], authors: [hex] });
    if (!event) return null;
    try {
      return JSON.parse(event.content) as Metadata;
    } catch {
      return null;
    }
  });
  return value;
}

export async function fetchFollowCount(hex: string): Promise<number | null> {
  const { value } = await memoize('follow', `following:${hex}`, async () => {
    const event = await querySingle({ kinds: [3], authors: [hex] });
    if (!event) return null;
    return event.tags.filter((t) => t[0] === 'p').length;
  });
  return value;
}

export async function fetchRecentNotes(hex: string, limit: number): Promise<Event[]> {
  const { value } = await memoize('feed', `notes:${hex}:${limit}`, async () => {
    return queryMany({ kinds: [1], authors: [hex] }, limit);
  });
  return value;
}

export function shutdownRelays(): void {
  if (!pool) return;
  pool.close(config.relays);
  pool = null;
}

export async function warmRelayPool(): Promise<void> {
  try {
    await Promise.race<unknown>([
      getPool().querySync(config.relays, { kinds: [0], limit: 1 }),
      new Promise((resolve) => setTimeout(resolve, config.relayTimeoutMs + 1000)),
    ]);
    process.stdout.write(`relay pool warmed (${config.relays.length} relays)\n`);
  } catch (err) {
    process.stderr.write(`relay pool warmup failed: ${(err as Error).message}\n`);
  }
}
