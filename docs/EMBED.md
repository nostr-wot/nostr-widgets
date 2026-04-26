# Embedding nostr-widgets

How to drop a widget into your site, README, blog post, newsletter, or anywhere that accepts HTML or Markdown.

The default production endpoint is **`https://nostr-wot.com/widgets/`** — every example below uses it. Replace with your self-hosted endpoint if you ran your own (see [DEPLOY.md](DEPLOY.md)).

## Three widgets

### Profile badge (`/widgets/profile/{npub}.svg`)

Avatar, display name, NIP-05 (if any), Web-of-Trust score and follower count.

```html
<a href="https://nostr-wot.com/profile/{npub}" rel="noopener">
  <img src="https://nostr-wot.com/widgets/profile/{npub}.svg"
       alt="{name} on Nostr"
       width="320" height="96" />
</a>
```

### Follow button (`/widgets/follow/{npub}.svg`)

A pill that says *Follow on Nostr*, optionally with a follower count.

```html
<a href="https://nostr-wot.com/profile/{npub}" rel="noopener">
  <img src="https://nostr-wot.com/widgets/follow/{npub}.svg"
       alt="Follow {name} on Nostr"
       width="220" height="40" />
</a>
```

### Feed strip (`/widgets/feed/{npub}.svg?n=3`)

Recent N notes from the npub. `n` is 1–5; default is 3.

```html
<a href="https://nostr-wot.com/profile/{npub}" rel="noopener">
  <img src="https://nostr-wot.com/widgets/feed/{npub}.svg?n=3"
       alt="Recent notes from {name}"
       width="480" />
</a>
```

Heights are dynamic: `56 + 80·n + 24` pixels. Don't hardcode `height` on a feed strip if `n` is variable.

## Where it works

| Surface | Works? | Notes |
|---|---|---|
| HTML page (any framework) | ✅ | Plain `<a><img></a>` |
| GitHub README | ✅ | Use Markdown image-link syntax (below) |
| GitLab README, Codeberg, Gitea | ✅ | Same |
| WordPress | ✅ | Custom HTML block |
| Ghost | ✅ | HTML card |
| Substack | ✅ | Custom HTML embed (paid plan); image-only on free |
| Notion | ⚠️ | "Embed" block sometimes downgrades to plain image — link may not survive |
| Hashnode | ✅ | Embed widget |
| Medium | ❌ | No raw HTML; image-only embeds drop the `<a>` |
| RSS readers | varies | Most show the SVG; many strip the `<a>` |
| Email clients | ⚠️ | Outlook/desktop clients often refuse external SVGs; use feed-strip with caution |

The widgets are designed for *web pages*. Email is best-effort.

## Markdown image-link syntax

For Markdown surfaces (READMEs, Hashnode, Dev.to, Hashnews):

```markdown
[![Leon on Nostr](https://nostr-wot.com/widgets/profile/npub1leon.svg)](https://nostr-wot.com/profile/npub1leon)
```

The outer link is the backlink. Don't drop it.

## Sizing tips

- Set explicit `width` / `height` on profile and follow widgets — they're fixed sizes, and the browser can reserve space before the SVG loads (no layout shift).
- For `feed`, omit `height` and let the browser size it from the SVG's intrinsic ratio. If the surface requires fixed height, calculate `56 + 80·n + 24` yourself.
- Don't apply CSS `border-radius` or `box-shadow` — the SVG already has its own corner radius and styling.

## Caching and freshness

Each widget sets cache headers tuned for its data type:

| Widget | Browser TTL | CDN TTL | Stale-while-revalidate |
|---|---|---|---|
| Profile | 10 min | 1 hr | 24 hr |
| Follow | 5 min | 30 min | 24 hr |
| Feed | 2 min | 10 min | 24 hr |

So a profile rename takes up to ~1 hour to propagate to fresh visitors of an integrator's CDN-fronted page. Notes refresh much faster.

Want shorter cache? Append a cachebust query string when the data has just changed: `?v=2`. Don't do it on every page load — it'll defeat the cache.

## Privacy

The image is fetched at *render time* by your visitor's browser. That means:

- We see the visitor's IP and `User-Agent` for the duration of the request.
- We don't log anything beyond `<iso-time> <method> <path> <status> <ms>` to the server's stdout. No analytics pixel, no third-party trackers.
- The SVG is fully self-contained — avatar bytes are inlined as `data:` URIs, so the *visitor's* browser doesn't fetch the avatar from `nostr.build` or wherever.
- See the source: [github.com/nostr-wot/nostr-widgets](https://github.com/nostr-wot/nostr-widgets).

## Accessibility

- Always set `alt`. The widgets render meaningful text (display name, "Follow on Nostr") so the SVG passes basic SEO/SR checks, but the `alt` is what screen readers prioritize.
- Avoid clicking-only patterns — the `<a>` href ensures keyboard navigation works for free.

## Embed examples

### React / Next.js

```tsx
export function NostrBadge({ npub }: { npub: string }) {
  return (
    <a href={`https://nostr-wot.com/profile/${npub}`} rel="noopener">
      <img
        src={`https://nostr-wot.com/widgets/profile/${npub}.svg`}
        alt={`Profile of ${npub.slice(0, 12)} on Nostr`}
        width={320}
        height={96}
        loading="lazy"
      />
    </a>
  );
}
```

### Astro / SvelteKit / vanilla SSR

Same `<a><img></a>`. Nothing framework-specific. The widgets are dumb resources.

### MDX (blog posts)

Inline the HTML — MDX accepts it directly.

```mdx
import { NostrBadge } from '@/components/nostr-badge';

<NostrBadge npub="npub1..." />
```

## When NOT to use a widget

- You need real-time interactivity (typing into a follow flow, replying to a note). Use a Nostr client iframe instead — but those don't carry SEO weight.
- You want client-side personalization (logged-in viewer state). The SVG is the same for everyone.
- You're embedding inside another `<svg>` — nested SVGs work in browsers but break in some Markdown renderers.

## Reporting issues

[github.com/nostr-wot/nostr-widgets/issues](https://github.com/nostr-wot/nostr-widgets/issues) — please include the URL of the widget that misbehaved.
