#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "▸ pulling latest"
git pull --ff-only

echo "▸ installing"
pnpm install --frozen-lockfile

echo "▸ building"
pnpm -r build

echo "▸ reloading pm2"
if pm2 describe nostr-widgets >/dev/null 2>&1; then
  pm2 reload nostr-widgets --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "✓ deployed"
