import { colors } from './shared/colors.js';
import { ellipsize, escapeXml } from './shared/escape.js';
import { fontFamilySans, fontFamilyMono } from './shared/fonts.js';
import { formatCount } from './shared/layout.js';
import { backgroundRect, gradientDefs } from './shared/svg.js';
import type { FollowData } from './types.js';

const W = 220;
const H = 40;

export function renderFollowButton(data: FollowData): string {
  const id = 'f';
  const name = ellipsize(escapeXml(data.displayName || 'this user'), 14);
  const count = data.followerCount !== undefined ? formatCount(data.followerCount) : null;

  const countBadge =
    count !== null
      ? `<g transform="translate(${W - 12 - (count.length * 7 + 18)}, 10)">
           <rect width="${count.length * 7 + 18}" height="20" rx="10" fill="${colors.pillBg}" stroke="${colors.borderSoft}" stroke-width="1"/>
           <text x="${(count.length * 7 + 18) / 2}" y="14" font-family="${fontFamilyMono}" font-size="10" fill="${colors.text}" font-weight="700" text-anchor="middle">${count}</text>
         </g>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Follow ${name} on Nostr">
${gradientDefs(id)}
${backgroundRect(id, W, H, 20)}
<g transform="translate(14, 12)">
  <path d="M0,8 L14,8 M7,1 L7,15" stroke="${colors.text}" stroke-width="1.8" stroke-linecap="round"/>
</g>
<text x="34" y="25" font-family="${fontFamilySans}" font-size="13" fill="${colors.text}" font-weight="600">Follow on Nostr</text>
${countBadge}
</svg>`;
}
