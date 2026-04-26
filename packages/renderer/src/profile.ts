import { colors } from './shared/colors.js';
import { ellipsize, escapeXml } from './shared/escape.js';
import { fontFamilySans, fontFamilyMono } from './shared/fonts.js';
import { identiconDataUri } from './shared/identicon.js';
import { clampScore, formatCount } from './shared/layout.js';
import { logoMarkup } from './shared/logo.js';
import { backgroundRect, gradientDefs } from './shared/svg.js';
import type { ProfileData } from './types.js';

const W = 320;
const H = 96;

export function renderProfileBadge(data: ProfileData): string {
  const id = 'p';
  const name = ellipsize(escapeXml(data.displayName || 'Anonymous'), 22);
  const nip05 = data.nip05 ? escapeXml(ellipsize(data.nip05, 26)) : '';
  const avatar = data.pictureDataUri ?? identiconDataUri(data.npub);

  const score = data.wotScore !== undefined ? clampScore(data.wotScore) : null;
  const followers = data.followerCount !== undefined ? formatCount(data.followerCount) : null;

  const metaLine = nip05
    ? `<text x="96" y="50" font-family="${fontFamilyMono}" font-size="11" fill="${colors.textMuted}">${nip05}</text>`
    : '';

  let statsX = 96;
  let stats = '';
  if (score !== null) {
    stats += `
      <g transform="translate(${statsX}, 62)">
        <rect width="64" height="22" rx="11" fill="${colors.pillBg}" stroke="${colors.borderSoft}" stroke-width="1"/>
        <text x="11" y="15" font-family="${fontFamilySans}" font-size="11" fill="${colors.trustGreen}" font-weight="600">WoT</text>
        <text x="40" y="15" font-family="${fontFamilyMono}" font-size="11" fill="${colors.text}" font-weight="700">${score}</text>
      </g>
    `;
    statsX += 72;
  }
  if (followers !== null) {
    stats += `
      <g transform="translate(${statsX}, 62)">
        <rect width="${followers.length * 7 + 56}" height="22" rx="11" fill="${colors.pillBg}" stroke="${colors.borderSoft}" stroke-width="1"/>
        <text x="11" y="15" font-family="${fontFamilySans}" font-size="11" fill="${colors.textMuted}">followers</text>
        <text x="${followers.length * 7 + 24}" y="15" font-family="${fontFamilyMono}" font-size="11" fill="${colors.text}" font-weight="700" text-anchor="end">${followers}</text>
      </g>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name} on Nostr">
${gradientDefs(id)}
${backgroundRect(id, W, H)}
<image href="${avatar}" x="16" y="16" width="64" height="64" clip-path="url(#${id}-avatar-clip)" preserveAspectRatio="xMidYMid slice"/>
<circle cx="48" cy="48" r="32" fill="none" stroke="${colors.borderSoft}" stroke-width="1.5"/>
<text x="96" y="32" font-family="${fontFamilySans}" font-size="15" fill="${colors.text}" font-weight="700">${name}</text>
${metaLine}
${stats}
${logoMarkup(W - 26, H - 22, 16)}
</svg>`;
}
