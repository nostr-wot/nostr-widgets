import { config } from './config.js';
import { memoize } from './cache.js';

async function fetchScore(npub: string): Promise<number | null> {
  if (!config.wotScoreUrl) return null;
  try {
    const url = `${config.wotScoreUrl.replace(/\/$/, '')}/${encodeURIComponent(npub)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { score?: number };
    if (typeof data.score !== 'number') return null;
    return data.score;
  } catch {
    return null;
  }
}

export async function getWotScore(npub: string): Promise<number | null> {
  const { value } = await memoize('wot', `score:${npub}`, () => fetchScore(npub));
  return value;
}
