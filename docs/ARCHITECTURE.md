# Architecture

## One-page overview

```
   browser / crawler
        │
        ▼
   nostr-wot.com   (nginx, ports 80/443, TLS termination)
        │
        ├─ /                 → 127.0.0.1:3000   (Next.js, pm2 app: nostr-wot)
        └─ /widgets/*        → 127.0.0.1:3001   (Hono,    pm2 app: nostr-widgets)
                                    │
                                    ├─► LRU cache (in-memory, per bucket)
                                    │
                                    ├─► nostr-tools SimplePool
                                    │      └─► relay.damus.io, relay.nostr.band,
                                    │          nos.lol, relay.snort.social,
                                    │          relay.primal.net
                                    │
                                    ├─► avatar fetch + sharp resize 96² + base64
                                    │
                                    └─► (optional) WoT score endpoint
                                           on the same VPS
```

The whole service is one Node process, fork-mode, single instance. There is no Redis, no queue, no shared store. State is the LRU cache map; on `pm2 reload` it's rebuilt cold. That's deliberate — caches refill in seconds, the cost of a flush is bounded, and no infrastructure surface means nothing else can break.

## URL contract

| Method | Path | Renders |
|---|---|---|
| GET | `/widgets/profile/{npub}.svg` | 320×96 profile badge |
| GET | `/widgets/follow/{npub}.svg` | 220×40 follow button |
| GET | `/widgets/feed/{npub}.svg?n=1..5` | 480×(56+80·n+24) recent notes |
| GET | `/health` | `{ status: "ok", relays: N }` |

`{npub}` is bech32-encoded (`npub1...`). Hex pubkeys return 400 — keeps URLs canonical and CDN-friendly.

## Data flow per request

1. Browser hits `nostr-wot.com/widgets/profile/<npub>.svg`.
2. nginx reverse-proxies to `127.0.0.1:3001/widgets/profile/<npub>.svg`.
3. Hono parses `<npub>`, decodes to hex via `nip19.decode`. Bad input → 400.
4. **Cache lookups in parallel:**
   - kind 0 metadata → `LRU.profile`, 5-min TTL
   - kind 3 follow list → `LRU.follow`, 5-min TTL (count = `tags.filter(p)`)
   - WoT score → `LRU.wot`, 5-min TTL
   - On miss: query relays via `SimplePool` (2 s timeout)
5. Avatar URL from metadata → `LRU.avatar` (30-min TTL). On miss: `fetch()` (2 s timeout, 200 KB cap, allowed types only) → `sharp` resize 96² → base64 → store as `data:image/jpeg;base64,...`. Failure → identicon fallback.
6. Hand resolved data to `@nostr-widgets/renderer` → SVG string.
7. Set headers (`Content-Type`, `Cache-Control`, `ETag`), respond.
8. If `If-None-Match` matched the freshly computed ETag → 304 Not Modified.

Every relay/avatar call is wrapped in `Promise.race` with a timeout. The endpoint never blocks on a flaky relay for more than 2 seconds.

## Caching layers

| Layer | Where | Profile | Follow | Feed | Avatar | WoT |
|---|---|---|---|---|---|---|
| L1 LRU | server memory (per bucket) | 5 min | 5 min | 60 s | 30 min | 5 min |
| L2 HTTP `Cache-Control` | integrator's browser + their CDN | `max-age=600, s-maxage=3600, swr=86400` | `300 / 1800 / 86400` | `120 / 600 / 86400` | n/a | n/a |

`stale-while-revalidate` is the load-bearing piece for end-user experience: if a CDN holds a 30-minute-old SVG and a request comes in, the CDN serves the stale copy *immediately* and asks us for a fresh one in the background. End user sees a fast image; we eventually return updated data without ever blocking them.

`ETag` = `sha256(svg).slice(0, 16)`. Integrator-side CDNs (Cloudflare, Fastly) get free 304s once the content stabilizes.

## Why nginx reverse proxy, not a separate subdomain

The whole point is **backlink credit**. A search-engine crawler that follows `<a href="https://nostr-wot.com/profile/leon"><img src="https://nostr-wot.com/widgets/profile/leon.svg"></a>` sees one origin: `nostr-wot.com`. The inbound `<a>` link counts towards `nostr-wot.com`'s authority graph.

If we served widgets from `widgets.nostr-wot.com`, the surrounding `<a>` would still credit `nostr-wot.com`, but mixing third-party origins on a host page introduces extra DNS, CSP and CORS surface for integrators. nginx-side rewriting is invisible to the host page — the integrator pastes one snippet, and crawlers, browsers and DevTools all see one origin.

## Why Hono and not Express

- Identical Express-style API (`app.get('/path', handler)`)
- ~14 KB, zero dependencies, TypeScript-first, built-in middleware
- Runs natively on Node, Bun, Deno, Cloudflare Workers, AWS Lambda — no rewrites if we ever move
- Faster cold start; small bundle

The choice doesn't matter much for our use case (stateless I/O-bound HTTP), but Hono carries no penalty over Express and gives optionality.

## Why pure-function renderer

Three reasons:

1. **Reusability.** Anyone can `npm i @nostr-widgets/renderer` and host their own widgets endpoint with no dependency on our server, our relay set, or our cache. Same artwork, different infra.
2. **Testability.** Snapshot tests with frozen fixtures — no relays, no fetch, no time mocks (where `Date.now()` matters, the caller passes it in).
3. **Portability.** Browser, Cloudflare Worker, Bun script — all valid runtimes. No Node-specifics in the renderer package.

The server is the I/O layer; the renderer is the pure layer. Keep them separate and both stay simple.

## Failure modes

| Failure | Behavior |
|---|---|
| Single relay slow / down | `Promise.race` returns whatever the others have; 2 s ceiling |
| All relays down for an npub | Empty metadata → renderer falls back to npub-prefix display name + identicon avatar; SVG is still valid, response is 200 |
| Avatar URL returns 404 / wrong type / oversize | identicon fallback; SVG remains 25–40 KB |
| nostr-tools throws on parse | npub-prefix display name + identicon |
| Rate limit hit | 429 with `Retry-After` header; integrators with HTTP cache won't notice |
| Server crash | pm2 restarts within ~1 s, max-memory-restart at 300 MB |

Nothing returns 5xx for relay flakiness. Errors are bounded to user input (400 for bad npub).

## Observability

- One log line per request: `<iso-timestamp> <method> <path> <status> <ms>`
- `/health` returns `{ status, relays }` — ping it from your monitoring of choice
- pm2's own `pm2 logs nostr-widgets` aggregates stdout/stderr

No Prometheus / OTel exporter on day one. If we add metrics later, the pure renderer never needs them — only `apps/server` does.

## Versioning

- `@nostr-widgets/renderer` follows semver. Major bump on any visual breaking change (dimensions, default theme).
- `@nostr-widgets/server` is internal — not published, just deployed.
- Releases are git tags (`renderer@v0.1.0`); CI publishes the renderer package on tag push (not yet wired — manual `npm publish` for v0.1).

## Adding a new widget kind

See [CONTRIBUTING.md](../CONTRIBUTING.md). Short version: add a pure render function in `packages/renderer/src/<kind>.ts`, export it, add a route in `apps/server/src/routes/<kind>.ts`, register it in `apps/server/src/index.ts`, document the embed.
