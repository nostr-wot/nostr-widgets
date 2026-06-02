import sharp from 'sharp';
import { config } from './config.js';
import { memoize } from './cache.js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function readCapped(response: Response, maxBytes: number): Promise<Buffer | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks, total);
}

async function cancelBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => {});
}

export async function fetchAndEncode(url: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(config.avatarFetchTimeoutMs),
      headers: { 'user-agent': 'nostr-widgets/0.1 (+https://nostr-wot.com)' },
    });
  } catch {
    return null;
  }
  if (!response.ok) {
    await cancelBody(response);
    return null;
  }
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    await cancelBody(response);
    return null;
  }
  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader && Number(lengthHeader) > config.avatarMaxBytes) {
    await cancelBody(response);
    return null;
  }

  const buf = await readCapped(response, config.avatarMaxBytes);
  if (!buf) return null;

  try {
    const resized = await sharp(buf, {
      failOn: 'truncated',
      limitInputPixels: config.avatarMaxPixels,
    })
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
