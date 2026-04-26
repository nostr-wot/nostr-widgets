import { describe, expect, it } from 'vitest';
import { renderProfileBadge } from './profile.js';

describe('renderProfileBadge', () => {
  it('produces a 320x96 SVG with the display name and via attribution', () => {
    const svg = renderProfileBadge({
      npub: 'npub1leon',
      displayName: 'Leon',
      nip05: 'leon@hodl.ar',
      wotScore: 87,
      followerCount: 1234,
    });
    expect(svg).toContain('width="320"');
    expect(svg).toContain('height="96"');
    expect(svg).toContain('Leon');
    expect(svg).toContain('leon@hodl.ar');
    expect(svg).toContain('via nostr-wot.com');
    expect(svg).toContain('WoT');
    expect(svg).toContain('87');
    expect(svg).toContain('1.2k');
  });

  it('falls back to an identicon when no picture is provided', () => {
    const svg = renderProfileBadge({ npub: 'npub1abc', displayName: 'A' });
    expect(svg).toContain('data:image/svg+xml;base64,');
  });

  it('escapes XML in displayName and nip05', () => {
    const svg = renderProfileBadge({
      npub: 'npub1x',
      displayName: '<script>"hi"</script>',
      nip05: "nip05'<bad>",
    });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&apos;');
  });
});
