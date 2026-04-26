import { Hono } from 'hono';
import { renderFeedStrip, type FeedLimit } from '@nostr-widgets/renderer';
import { resolveAvatar } from '../avatar.js';
import { svgCacheHeaders } from '../middleware/cache-headers.js';
import { fetchMetadata, fetchRecentNotes, InvalidNpubError, npubToHex } from '../relays.js';

export const feedRoute = new Hono();

function parseLimit(raw: string | undefined): FeedLimit {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 3;
}

feedRoute.get('/:npub{.+\\.svg}', svgCacheHeaders('feed'), async (c) => {
  const raw = c.req.param('npub');
  if (!raw || !raw.endsWith('.svg')) return c.text('not found', 404);
  const npub = raw.slice(0, -4);
  const limit = parseLimit(c.req.query('n'));

  let hex: string;
  try {
    hex = npubToHex(npub);
  } catch (err) {
    if (err instanceof InvalidNpubError) return c.text(err.message, 400);
    throw err;
  }

  const [meta, events] = await Promise.all([fetchMetadata(hex), fetchRecentNotes(hex, limit)]);
  const pictureDataUri = await resolveAvatar(meta?.picture);
  const displayName =
    meta?.display_name?.trim() || meta?.name?.trim() || `${npub.slice(0, 12)}…`;

  const svg = renderFeedStrip(
    {
      npub,
      displayName,
      ...(pictureDataUri ? { pictureDataUri } : {}),
      notes: events.map((e) => ({ id: e.id, createdAt: e.created_at, content: e.content })),
    },
    limit,
  );

  return c.body(svg);
});
