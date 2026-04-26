import { colors } from './shared/colors.js';
import { ellipsize, escapeXml } from './shared/escape.js';
import { fontFamilySans } from './shared/fonts.js';
import { identiconDataUri } from './shared/identicon.js';
import { backgroundRect, gradientDefs } from './shared/svg.js';
import type { FeedData, FeedLimit, FeedNote } from './types.js';

const W = 480;
const ROW_H = 80;
const HEADER_H = 56;

function relativeTime(createdAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor(now / 1000) - createdAt);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
}

function renderRow(note: FeedNote, y: number, now: number): string {
  const text = ellipsize(escapeXml(note.content.replace(/\s+/g, ' ').trim()), 110);
  const stamp = relativeTime(note.createdAt, now);
  return `
    <g transform="translate(0, ${y})">
      <line x1="16" y1="0" x2="${W - 16}" y2="0" stroke="${colors.borderSoft}" stroke-width="1"/>
      <text x="16" y="28" font-family="${fontFamilySans}" font-size="13" fill="${colors.text}">${text.slice(0, 60)}</text>
      <text x="16" y="48" font-family="${fontFamilySans}" font-size="12" fill="${colors.textMuted}">${text.slice(60)}</text>
      <text x="${W - 16}" y="28" font-family="${fontFamilySans}" font-size="11" fill="${colors.textDim}" text-anchor="end">${stamp}</text>
    </g>
  `;
}

export function renderFeedStrip(data: FeedData, limit: FeedLimit, nowMs = Date.now()): string {
  const id = 'd';
  const name = ellipsize(escapeXml(data.displayName || 'Anonymous'), 28);
  const avatar = data.pictureDataUri ?? identiconDataUri(data.npub);
  const notes = data.notes.slice(0, limit);
  const totalH = HEADER_H + notes.length * ROW_H + 24;

  const rows = notes.map((n, i) => renderRow(n, HEADER_H + i * ROW_H, nowMs)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}" role="img" aria-label="${name} on Nostr — recent notes">
${gradientDefs(id)}
${backgroundRect(id, W, totalH)}
<g>
  <image href="${avatar}" x="16" y="12" width="32" height="32" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="32" cy="28" r="16" fill="none" stroke="${colors.borderSoft}" stroke-width="1"/>
  <text x="56" y="32" font-family="${fontFamilySans}" font-size="14" fill="${colors.text}" font-weight="700">${name}</text>
  <text x="${W - 16}" y="32" font-family="${fontFamilySans}" font-size="10" fill="${colors.textDim}" text-anchor="end">via nostr-wot.com</text>
</g>
${rows}
</svg>`;
}
