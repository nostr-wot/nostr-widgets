import sharp from 'sharp';
import { config } from './config.js';
import { memoize } from './cache.js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function fetchAndEncode(url: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(2000),
      headers: { 'user-agent': 'nostr-widgets/0.1 (+https://nostr-wot.com)' },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (!contentType || !ALLOWED_TYPES.has(contentType)) return null;
  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader && Number(lengthHeader) > config.avatarMaxBytes) return null;
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.byteLength > config.avatarMaxBytes) return null;

  try {
    const resized = await sharp(buf, { failOn: 'truncated' })
      .resize(96, 96, { fit: 'cover' })
      .jpeg({ quality: 82, progressive: false })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function resolveAvatar(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  if (!/^https:\/\//i.test(url)) return null;
  const { value } = await memoize('avatar', `av:${url}`, () => fetchAndEncode(url));
  return value;
}
