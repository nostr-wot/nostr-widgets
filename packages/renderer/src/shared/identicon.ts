const PALETTE = [
  '#7c3aed',
  '#4ade80',
  '#facc15',
  '#f472b6',
  '#60a5fa',
  '#fb923c',
  '#22d3ee',
  '#a78bfa',
];

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function identiconDataUri(seed: string, size = 96): string {
  const hash = fnv1a(seed);
  const cells = 5;
  const cellSize = size / cells;
  const colorA = PALETTE[hash % PALETTE.length] ?? '#7c3aed';
  const colorB = PALETTE[(hash >>> 8) % PALETTE.length] ?? '#4ade80';

  let rects = `<rect width="${size}" height="${size}" fill="${colorB}"/>`;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      const bit = (hash >>> (y * 3 + x)) & 1;
      if (!bit) continue;
      const rx = x * cellSize;
      const ry = y * cellSize;
      rects += `<rect x="${rx}" y="${ry}" width="${cellSize}" height="${cellSize}" fill="${colorA}"/>`;
      const mx = (cells - 1 - x) * cellSize;
      if (mx !== rx) {
        rects += `<rect x="${mx}" y="${ry}" width="${cellSize}" height="${cellSize}" fill="${colorA}"/>`;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${rects}</svg>`;
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(svg, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}
