const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.primal.net',
];

function parseRelays(env: string | undefined): string[] {
  if (!env) return DEFAULT_RELAYS;
  const items = env
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('wss://') || s.startsWith('ws://'));
  return items.length > 0 ? items : DEFAULT_RELAYS;
}

export const config = {
  port: Number(process.env.PORT ?? 3004),
  relays: parseRelays(process.env.NOSTR_RELAYS),
  relayTimeoutMs: Number(process.env.RELAY_TIMEOUT_MS ?? 4000),
  avatarMaxBytes: Number(process.env.AVATAR_MAX_BYTES ?? 1_000_000),
  avatarMaxDimension: Number(process.env.AVATAR_MAX_DIM ?? 2048),
  rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 60),
  wotScoreUrl: process.env.WOT_SCORE_URL ?? '',
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? 'https://nostr-wot.com',
} as const;
