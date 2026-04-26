import { describe, expect, it } from 'vitest';
import { renderFollowButton } from './follow.js';

describe('renderFollowButton', () => {
  it('renders a 220x40 SVG with the Follow on Nostr label', () => {
    const svg = renderFollowButton({
      npub: 'npub1leon',
      displayName: 'Leon',
      followerCount: 9876,
    });
    expect(svg).toContain('width="220"');
    expect(svg).toContain('height="40"');
    expect(svg).toContain('Follow on Nostr');
    expect(svg).toContain('9.9k');
  });

  it('omits the count badge when followerCount is missing', () => {
    const svg = renderFollowButton({ npub: 'npub1x', displayName: 'A' });
    expect(svg).toContain('Follow on Nostr');
    expect(svg).not.toMatch(/<rect[^/>]*rx="10"/);
  });
});
