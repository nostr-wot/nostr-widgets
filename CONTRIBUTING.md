# Contributing to nostr-widgets

Thanks for considering a contribution. The project is intentionally small and stays that way — pure-function renderer + thin Hono server. Most contributions land in `packages/renderer/src/<kind>.ts` or as a new route in `apps/server/src/routes/`.

## Local setup

```bash
pnpm install
pnpm -r build
pnpm test
pnpm --filter @nostr-widgets/server dev
```

Visit `http://localhost:3001/widgets/profile/<npub>.svg` to verify.

## Adding a new widget kind

1. Define data shape in `packages/renderer/src/types.ts`.
2. Create `packages/renderer/src/<kind>.ts` exporting a pure `render<Kind>(data): string`.
3. Re-export from `packages/renderer/src/index.ts`.
4. Add `packages/renderer/src/<kind>.test.ts` with at least: dimension assertions, escape correctness, fallback behavior.
5. Create `apps/server/src/routes/<kind>.ts` that fetches data from relays and calls the renderer.
6. Register the route in `apps/server/src/index.ts`.
7. Add a cache TTL bucket in `apps/server/src/cache.ts` if the data shape is new.
8. Document the embed snippet in `README.md`.

## Style

- Pure functions in the renderer. No I/O, no `Date.now()` without it being passed in.
- TypeScript strict mode; no `any`.
- Two-space indent, single quotes, semicolons (Prettier config in repo).
- Default to no comments. Comment only the *why*, never the *what*.

## Testing

`vitest` runs in both packages. Renderer tests are snapshot-style (assert on string content); server tests should use a fake relay pool, not real network.

## Commit / PR

- One conceptual change per PR.
- Run `pnpm typecheck && pnpm test && pnpm format` before pushing.
- Please open an issue first for new widget kinds so we can agree on dimensions and data contract before you implement.

## License

By contributing you agree your code is released under the MIT license.
