import { colors } from './colors.js';

export function gradientDefs(idPrefix: string): string {
  return `
    <defs>
      <linearGradient id="${idPrefix}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors.bgFrom}"/>
        <stop offset="50%" stop-color="${colors.bgVia}"/>
        <stop offset="100%" stop-color="${colors.bgTo}"/>
      </linearGradient>
      <radialGradient id="${idPrefix}-glow" cx="20%" cy="50%" r="60%">
        <stop offset="0%" stop-color="${colors.brandPurple}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${colors.bgFrom}" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="${idPrefix}-avatar-clip">
        <circle cx="48" cy="48" r="32"/>
      </clipPath>
    </defs>
  `;
}

export function backgroundRect(idPrefix: string, w: number, h: number, rx = 12): string {
  return `
    <rect width="${w}" height="${h}" rx="${rx}" fill="url(#${idPrefix}-bg)"/>
    <rect width="${w}" height="${h}" rx="${rx}" fill="url(#${idPrefix}-glow)"/>
    <rect width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${colors.borderSoft}" stroke-width="1"/>
  `;
}
