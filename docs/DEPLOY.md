# Deploy

## Where it runs

The canonical production endpoint is **`https://nostr-wot.com/widgets/`**. Hosted on the same VPS that serves nostr-wot.com (Hetzner / Contabo / your equivalent — single box, no edge, no autoscaler). nginx terminates TLS and reverse-proxies `/widgets/*` to a Node process bound to `127.0.0.1:3001`. pm2 keeps the process alive across reboots and reloads.

This document covers:

1. **First-time setup** on a fresh server.
2. **Continuous deploys** after the box is running.
3. **nginx wiring** in detail.
4. **Troubleshooting** common failures.
5. **Rollback** if a deploy goes bad.

## Prerequisites

The server needs:

| Tool | Version | How to install (Debian/Ubuntu) |
|---|---|---|
| Node.js | ≥ 20.10 | [nodesource setup](https://github.com/nodesource/distributions) |
| pnpm | ≥ 9.x | `npm i -g pnpm` after Node is in place |
| pm2 | latest | `npm i -g pm2` |
| git | any modern | `apt install git` |
| nginx | any modern | `apt install nginx` (already installed on this box) |

`sharp` (used for avatar resize) ships prebuilt binaries for `linux-x64` and `linux-arm64`. If you're on something exotic, install `libvips` first or expect a long build.

## First-time setup

Run as root or whatever user owns `/var/www`.

```bash
# 1. Clone
mkdir -p /var/www
cd /var/www
git clone git@github.com:nostr-wot/nostr-widgets.git
cd nostr-widgets

# 2. Install + build
pnpm install --frozen-lockfile
pnpm -r build

# 3. Logs directory
mkdir -p /var/log/pm2

# 4. Start
pm2 start ecosystem.config.cjs

# 5. Persist across reboots
pm2 save
pm2 startup
# (run the printed `sudo env PATH=... pm2 startup ...` command if it shows one)

# 6. Confirm it's listening
curl -s http://127.0.0.1:3001/health
# → {"status":"ok","relays":5}
```

Add the [nginx location block](../deploy/nginx.conf.example) inside the existing `nostr-wot.com` server block, then:

```bash
sudo nginx -t      # syntax check
sudo systemctl reload nginx
```

Verify externally:

```bash
curl -I https://nostr-wot.com/health  # should still be Next.js 404 (or whatever)
curl -I https://nostr-wot.com/widgets/profile/npub1leon.svg
# → HTTP/1.1 200, Content-Type: image/svg+xml, Cache-Control set
```

## Continuous deploys

There's a deploy script at `scripts/deploy.sh`. Run it on the server:

```bash
cd /var/www/nostr-widgets
./scripts/deploy.sh
```

It does:

1. `git pull --ff-only`
2. `pnpm install --frozen-lockfile`
3. `pnpm -r build`
4. `pm2 reload nostr-widgets --update-env` (or `pm2 start ecosystem.config.cjs` if not yet running)
5. `pm2 save`

The script is idempotent and refuses non-fast-forward pulls — if the working tree is dirty or you've cherry-picked locally, fix that first instead of forcing through.

### Triggering it from your laptop

```bash
ssh root@<server> 'cd /var/www/nostr-widgets && ./scripts/deploy.sh'
```

Or wire a GitHub Actions job that SSHes in on `push` to `main`. (Not built yet — would need a deploy key in `Secrets`.)

## nginx config (full reference)

Add this block inside the existing `server { ... }` for `nostr-wot.com`, **above** the catch-all `location /` that proxies to the Next.js process. Order matters — nginx picks the longest matching prefix.

```nginx
location /widgets/ {
    proxy_pass         http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    proxy_pass_request_headers on;
    proxy_buffering            off;

    # Relay-bound app, 2 s internal ceiling — leave headroom
    proxy_connect_timeout 3s;
    proxy_read_timeout    5s;
    proxy_send_timeout    5s;
}
```

Notes:

- The trailing slash on `location /widgets/` and `proxy_pass http://127.0.0.1:3001` keeps the path intact: `/widgets/profile/npub1...svg` → upstream sees the same path. Drop either trailing slash and the path will reshape unexpectedly.
- `proxy_buffering off` is intentional. The SVG payload is small and we want headers to flow back fast.
- `Cache-Control` and `ETag` from the app pass through nginx unchanged. We do **not** add nginx-level caching — the app's headers are tighter and the integrator's CDN does the heavy lifting.
- If you're using Cloudflare in front, set the orange-cloud cache level to "Standard" (or higher) and the SVGs will live in Cloudflare for `s-maxage=3600` automatically.

## Configuration (env vars)

All optional; defaults below are baked in.

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | port to listen on |
| `NOSTR_RELAYS` | five public relays | comma-separated `wss://` URLs |
| `RELAY_TIMEOUT_MS` | `2000` | per-query timeout |
| `AVATAR_MAX_BYTES` | `200000` | reject avatars larger than this |
| `AVATAR_MAX_DIM` | `2048` | reject avatars larger than this in either dimension |
| `RATE_LIMIT_PER_MIN` | `60` | per-IP per-route token bucket |
| `WOT_SCORE_URL` | (empty) | optional internal endpoint, expects `{ score: 0..100 }` |
| `PUBLIC_SITE_URL` | `https://nostr-wot.com` | used in attribution links |

To set: edit `ecosystem.config.cjs` (the `env` block) then `pm2 reload nostr-widgets --update-env`. **Don't** put secrets in `ecosystem.config.cjs` — there are none today, but if you ever add one, source it from `/etc/nostr-widgets.env` and load via `dotenv`.

## Verifying a deploy

```bash
# Local to the box
curl -s http://127.0.0.1:3001/health
curl -sI http://127.0.0.1:3001/widgets/profile/npub1leon.svg | head

# From outside
curl -sI https://nostr-wot.com/widgets/profile/npub1leon.svg | head
# Expect: 200, Content-Type: image/svg+xml, Cache-Control: public, max-age=600...
```

## Troubleshooting

**`Cannot find module '@nostr-widgets/renderer'`** — you ran the server before building. `pnpm -r build` first; the renderer's `dist/` must exist before the server bundle imports it.

**`Error: Could not load the "sharp" module`** — `sharp`'s prebuilt binary didn't match the OS / arch. Run `pnpm rebuild sharp` inside `apps/server`. On Alpine, install `vips-dev` first.

**`pm2: command not found`** — install globally: `npm i -g pm2`. Re-source your shell after.

**`502 Bad Gateway` from nginx on `/widgets/*`** — the Hono process isn't listening on `127.0.0.1:3001`. Check `pm2 status` and `pm2 logs nostr-widgets --lines 50`.

**SVG returns but no avatar shows** — likely the avatar URL was unreachable, oversize, or wrong content-type. Identicon fallback should take over; if it doesn't, it's a renderer bug — open an issue.

**Empty SVG / 502 burst** — relays might be slow. The 2 s timeout caps damage, but if every relay is wedged you get sparse SVGs. Add a known-stable relay to `NOSTR_RELAYS`.

**Rate-limit hits in legitimate traffic** — bump `RATE_LIMIT_PER_MIN` in env. Token bucket is per-IP per-route. Reset on `pm2 reload`.

## Rollback

The repo is the source of truth. Roll back by checking out a known-good commit:

```bash
cd /var/www/nostr-widgets
git fetch origin
git checkout <good-sha>
pnpm install --frozen-lockfile
pnpm -r build
pm2 reload nostr-widgets
```

`pm2 reload` is graceful: in-flight requests finish on the old process before the new one takes over. No dropped connections.

## Logs

```bash
pm2 logs nostr-widgets --lines 200          # live tail
pm2 logs nostr-widgets --err --lines 200    # errors only
journalctl -u nginx -f                      # nginx
```

Process logs land in `/var/log/pm2/nostr-widgets.{out,err}.log` (configured in `ecosystem.config.cjs`).

## Health checks

`/health` returns `200 {"status":"ok","relays":N}` if the process is up. It does **not** verify any relay is currently answering — it only confirms the configured count. Wire it into your uptime monitor of choice; missing 200 = process down.

Stricter check: `GET /widgets/profile/npub1...svg` against a known-good npub. If it returns non-200, something deeper is broken.

## Updating Node / pnpm / pm2

```bash
# Node — use n or nvm
n 20.18.0
# or for the system: re-run the nodesource installer

# pnpm
npm i -g pnpm@latest

# pm2 — update without process loss
pm2 update     # respawns each app under the new pm2
```

## Disaster recovery (whole box gone)

1. Restore the existing nostr-wot.com Next.js app per its own runbook.
2. Re-run [First-time setup](#first-time-setup).
3. Re-add the nginx location block. `nginx -t && systemctl reload nginx`.
4. There is no DB to restore. Caches are warm-from-empty in seconds.

## Local development

```bash
git clone git@github.com:nostr-wot/nostr-widgets.git
cd nostr-widgets
pnpm install
pnpm -r build

# Live reload of the server
pnpm --filter @nostr-widgets/server dev

# Tests
pnpm -r test

# Typecheck
pnpm -r typecheck
```

The dev server defaults to port 3001 on localhost. Hit `http://localhost:3001/health` to confirm.

To test a widget locally, you'll need a real npub:

```bash
curl http://localhost:3001/widgets/profile/npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s.svg \
  > /tmp/widget.svg && open /tmp/widget.svg
```
