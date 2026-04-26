# @nostr-widgets/renderer

Pure-function SVG renderers for Nostr profile, follow, and feed widgets. Zero runtime dependencies; runs in any JS environment (Node, Bun, Deno, Cloudflare Workers, the browser).

## Install

```bash
pnpm add @nostr-widgets/renderer
```

## Usage

```ts
import { renderProfileBadge, renderFollowButton, renderFeedStrip } from '@nostr-widgets/renderer';

const svg = renderProfileBadge({
  npub: 'npub1...',
  displayName: 'Leon',
  nip05: 'leon@hodl.ar',
  pictureDataUri: 'data:image/jpeg;base64,...',
  wotScore: 87,
  followerCount: 1234,
});
```

The renderer never performs I/O. The caller is responsible for fetching profile metadata, resolving the avatar to a `data:` URI, and counting follows. Use `nostr-tools` (or any relay client) on the server side, then hand the resolved data to the renderer.

## Output dimensions

| Function | Width | Height |
|---|---|---|
| `renderProfileBadge` | 320 | 96 |
| `renderFollowButton` | 220 | 40 |
| `renderFeedStrip(data, n)` | 480 | 56 + 80·n + 24 |

## License

MIT
