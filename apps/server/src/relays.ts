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

async function querySingle(filter: Filter): Promise<Event | null> {
  const events = await Promise.race<Event[]>([
    getPool().querySync(config.relays, filter),
    new Promise<Event[]>((resolve) => setTimeout(() => resolve([]), config.relayTimeoutMs)),
  ]);
  if (events.length === 0) return null;
  return events.reduce((newest, current) =>
    current.created_at > newest.created_at ? current : newest,
  );
}

async function queryMany(filter: Filter, limit: number): Promise<Event[]> {
  const events = await Promise.race<Event[]>([
    getPool().querySync(config.relays, { ...filter, limit }),
    new Promise<Event[]>((resolve) => setTimeout(() => resolve([]), config.relayTimeoutMs)),
  ]);
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
