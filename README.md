# nostr-widgets

Server-rendered SVG widgets for Nostr profiles, follow buttons, and recent feeds. Embed anywhere with a plain `<a><img></a>` snippet — no JavaScript, no iframes, full backlink credit.

Hosted at **[nostr-wot.com/widgets](https://nostr-wot.com/widgets)**. Self-hosting your own endpoint is fully supported (see below).

## Embed

### Profile badge — 320 × 96

```html
<a href="https://nostr-wot.com/p/{npub}">
  <img src="https://nostr-wot.com/widgets/profile/{npub}.svg"
       alt="Leon on Nostr" width="320" height="96">
</a>
```

### Follow button — 220 × 40

```html
<a href="https://nostr-wot.com/p/{npub}">
  <img src="https://nostr-wot.com/widgets/follow/{npub}.svg"
       alt="Follow Leon on Nostr" width="220" height="40">
</a>
```

### Feed strip — 480 × (56 + 80·n + 24)

```html
<a href="https://nostr-wot.com/p/{npub}">
  <img src="https://nostr-wot.com/widgets/feed/{npub}.svg?n=3"
       alt="Recent notes from Leon" width="480">
</a>
```

`n` is 1–5; default 3.

## How it works

1. Browser requests `nostr-wot.com/widgets/profile/{npub}.svg`.
2. nginx on the VPS reverse-proxies `/widgets/*` to a Hono app on `127.0.0.1:3001`.
3. The Hono app fetches kind 0/3/1 events from a curated relay set, resolves the avatar to a `data:` URI, and calls `@nostr-widgets/renderer` to produce a self-contained SVG.
4. The SVG ships with `Cache-Control: public, max-age, s-maxage, stale-while-revalidate` and an `ETag`. Integrators with their own CDN get free 304s.

Everything is in-memory; no Redis, no external cache. One pm2 process, one LRU per cache bucket.

## Repo layout

```
nostr-widgets/
├── packages/renderer/    # @nostr-widgets/renderer — pure data→SVG, zero deps
└── apps/server/          # Hono service that fetches relay data and serves SVGs
```

The renderer is publishable to npm so any Nostr project can host its own widgets endpoint with the same artwork.

## Local development

```bash
pnpm install
pnpm -r build
pnpm --filter @nostr-widgets/server dev
# open http://localhost:3001/widgets/profile/<npub>.svg
```

Run tests:

```bash
pnpm test
```

## Self-hosting your own endpoint

Use the renderer package directly — bring your own relay client, avatar fetcher, and cache:

```ts
import { renderProfileBadge } from '@nostr-widgets/renderer';

const svg = renderProfileBadge({
  npub,
  displayName,
  pictureDataUri,
  wotScore,
  followerCount,
});
```

Or copy `apps/server` and deploy it under your own domain. PRs welcome.

## Deployment (production / nostr-wot.com)

The widgets app runs on the same VPS as `nostr-wot.com`, behind nginx, managed by pm2.

- nginx snippet: [`deploy/nginx.conf.example`](deploy/nginx.conf.example)
- pm2 config: [`ecosystem.config.cjs`](ecosystem.config.cjs)
- deploy script: [`scripts/deploy.sh`](scripts/deploy.sh)

First-time setup on the VPS:

```bash
git clone git@github.com:nostr-wot/nostr-widgets.git /var/www/nostr-widgets
cd /var/www/nostr-widgets
pnpm install
pnpm -r build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed instruction
```

Subsequent deploys: `./scripts/deploy.sh`.

## Configuration

All env vars optional; sensible defaults baked in.

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | port to listen on |
| `NOSTR_RELAYS` | five public relays | comma-separated `wss://` URLs |
| `RELAY_TIMEOUT_MS` | `2000` | per-query timeout |
| `AVATAR_MAX_BYTES` | `200000` | reject avatars larger than this |
| `RATE_LIMIT_PER_MIN` | `60` | per-IP per-route token bucket |
| `WOT_SCORE_URL` | (empty) | optional internal endpoint, expects `{ score: 0..100 }` |
| `PUBLIC_SITE_URL` | `https://nostr-wot.com` | used in attribution links |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome — particularly new widget kinds and translations of the small amount of label text.

## License

[MIT](LICENSE)
