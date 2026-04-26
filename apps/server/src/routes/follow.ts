import { Hono } from 'hono';
import { renderFollowButton } from '@nostr-widgets/renderer';
import { svgCacheHeaders } from '../middleware/cache-headers.js';
import { fetchFollowCount, fetchMetadata, InvalidNpubError, npubToHex } from '../relays.js';

export const followRoute = new Hono();

followRoute.get('/:npub{.+\\.svg}', svgCacheHeaders('follow'), async (c) => {
  const raw = c.req.param('npub');
  if (!raw || !raw.endsWith('.svg')) return c.text('not found', 404);
  const npub = raw.slice(0, -4);

  let hex: string;
  try {
    hex = npubToHex(npub);
  } catch (err) {
    if (err instanceof InvalidNpubError) return c.text(err.message, 400);
    throw err;
  }

  const [meta, followers] = await Promise.all([fetchMetadata(hex), fetchFollowCount(hex)]);
  const displayName =
    meta?.display_name?.trim() || meta?.name?.trim() || `${npub.slice(0, 12)}…`;

  const svg = renderFollowButton({
    npub,
    displayName,
    ...(followers !== null ? { followerCount: followers } : {}),
  });

  return c.body(svg);
});
