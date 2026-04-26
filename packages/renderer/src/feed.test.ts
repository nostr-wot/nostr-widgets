import { describe, expect, it } from 'vitest';
import { renderFeedStrip } from './feed.js';

const now = new Date('2026-04-26T12:00:00Z').getTime();

describe('renderFeedStrip', () => {
  it('renders header + N rows for the requested limit', () => {
    const svg = renderFeedStrip(
      {
        npub: 'npub1leon',
        displayName: 'Leon',
        notes: [
          { id: 'a', createdAt: Math.floor(now / 1000) - 60, content: 'first note' },
          { id: 'b', createdAt: Math.floor(now / 1000) - 3600, content: 'second note' },
          { id: 'c', createdAt: Math.floor(now / 1000) - 86400, content: 'third note' },
        ],
      },
      3,
      now,
    );
    expect(svg).toContain('Leon');
    expect(svg).toContain('first note');
    expect(svg).toContain('second note');
    expect(svg).toContain('third note');
    expect(svg).toContain('1m');
    expect(svg).toContain('1h');
    expect(svg).toContain('1d');
  });

  it('truncates extra notes beyond the limit', () => {
    const svg = renderFeedStrip(
      {
        npub: 'npub1x',
        displayName: 'X',
        notes: Array.from({ length: 5 }, (_, i) => ({
          id: String(i),
          createdAt: Math.floor(now / 1000) - i * 60,
          content: `note ${i}`,
        })),
      },
      2,
      now,
    );
    expect(svg).toContain('note 0');
    expect(svg).toContain('note 1');
    expect(svg).not.toContain('note 2');
  });
});
