import { Hono } from 'hono';
import { renderProfileBadge } from '@nostr-widgets/renderer';
import { resolveAvatar } from '../avatar.js';
import { svgCacheHeaders } from '../middleware/cache-headers.js';
import { fetchFollowCount, fetchMetadata, InvalidNpubError, npubToHex } from '../relays.js';
import { getWotScore } from '../wot.js';

export const profileRoute = new Hono();

profileRoute.get('/:npub{.+\\.svg}', svgCacheHeaders('profile'), async (c) => {
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

  const [meta, followers, score] = await Promise.all([
    fetchMetadata(hex),
    fetchFollowCount(hex),
    getWotScore(npub),
  ]);

  const pictureDataUri = await resolveAvatar(meta?.picture);
  const displayName =
    meta?.display_name?.trim() || meta?.name?.trim() || `${npub.slice(0, 12)}…`;

  const svg = renderProfileBadge({
    npub,
    displayName,
    ...(meta?.nip05 ? { nip05: meta.nip05 } : {}),
    ...(pictureDataUri ? { pictureDataUri } : {}),
    ...(score !== null ? { wotScore: score } : {}),
    ...(followers !== null ? { followerCount: followers } : {}),
  });

  return c.body(svg);
});
