# nostr-widgets

Server-rendered SVG widgets for Nostr profiles, follow buttons, and recent feeds. Embed anywhere with a plain `<a><img></a>` snippet — no JavaScript, no iframes, full backlink credit.

**Production endpoint:** `https://nostr-wot.com/widgets/` — hosted on the same VPS that serves nostr-wot.com, behind nginx, kept alive with pm2. Open-source so anyone can self-host or contribute new widgets. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the runtime, [docs/DEPLOY.md](docs/DEPLOY.md) for the runbook, [docs/EMBED.md](docs/EMBED.md) for integrator examples.

## Embed (TL;DR)

```html
<!-- Profile badge — 320 × 96 -->
<a href="https://nostr-wot.com/profile/{npub}">
  <img src="https://nostr-wot.com/widgets/profile/{npub}.svg" width="320" height="96" alt="…">
</a>

<!-- Follow button — 220 × 40 -->
<a href="https://nostr-wot.com/profile/{npub}">
  <img src="https://nostr-wot.com/widgets/follow/{npub}.svg" width="220" height="40" alt="Follow …">
</a>

<!-- Feed strip — 480 × dynamic, n is 1..5, default 3 -->
<a href="https://nostr-wot.com/profile/{npub}">
  <img src="https://nostr-wot.com/widgets/feed/{npub}.svg?n=3" width="480" alt="…">
</a>
```

Markdown / WordPress / Ghost / Substack / RSS / GitHub READMEs — all covered with examples in [**docs/EMBED.md**](docs/EMBED.md).

### Live example

Embedding the project's own founder ([`npub1gxdh…wzfk`](https://nostr-wot.com/profile/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk)):

```html
<a href="https://nostr-wot.com/profile/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk">
  <img src="https://nostr-wot.com/widgets/profile/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk.svg"
       width="320" height="96" alt="Leon on Nostr" />
</a>
```

Renders as:

[![Leon on Nostr](https://nostr-wot.com/widgets/profile/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk.svg)](https://nostr-wot.com/profile/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk)

Same npub on the follow button and feed strip:

[![Follow Leon on Nostr](https://nostr-wot.com/widgets/follow/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk.svg)](https://nostr-wot.com/profile/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk)

[![Recent notes from Leon](https://nostr-wot.com/widgets/feed/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk.svg?n=3)](https://nostr-wot.com/profile/npub1gxdhmu9swqduwhr6zptjy4ya693zp3ql28nemy4hd97kuufyrqdqwe5zfk)

## How it works (one paragraph)

Browser requests `nostr-wot.com/widgets/profile/{npub}.svg`. nginx reverse-proxies `/widgets/*` to a Hono app on `127.0.0.1:3004`. The app fetches kind 0/3/1 events from a curated relay set, resolves the avatar to a `data:` URI (sharp resize 96², 200 KB cap, identicon fallback), and calls `@nostr-widgets/renderer` to produce a self-contained SVG. Response ships with `Cache-Control: public, max-age, s-maxage, stale-while-revalidate` and an `ETag` for free 304s. Everything is in-memory; one pm2 process, one LRU per cache bucket. Deeper detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
# open http://localhost:3004/widgets/profile/<npub>.svg
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

## Deployment

Full runbook in [**docs/DEPLOY.md**](docs/DEPLOY.md): first-time setup, continuous deploys, nginx wiring, troubleshooting, rollback.

TL;DR for an existing box:

```bash
ssh root@<server>
cd /var/www/nostr-widgets && ./scripts/deploy.sh
```

Reference assets in this repo:

- nginx snippet → [`deploy/nginx.conf.example`](deploy/nginx.conf.example)
- pm2 config → [`ecosystem.config.cjs`](ecosystem.config.cjs)
- deploy script → [`scripts/deploy.sh`](scripts/deploy.sh)

## Configuration

All env vars optional; sensible defaults baked in.

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `3004` | port to listen on |
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
