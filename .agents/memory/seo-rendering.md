---
name: SEO rendering policy
description: Why the storefront uses shared server rendering and the development/build SSR pitfalls.
---

Render the same sales components for bots and visitors; do not maintain a separate bot-only sales copy or replace real Whop prices with samples.

**Why:** the SEO requirement is to make the existing pixel storefront readable without JavaScript, while preserving its design, multilingual content and interactive checkout.

**How to apply:** future content changes should continue to appear in initial HTML and in the hydrated UI. Catalog caching must expire and revalidate; unavailable catalog data must not become indefinitely stale advertised prices.

Vite's development SSR cannot safely inline every dependency with `noExternal: true`; CommonJS React entry points then fail with `module is not defined`. Full bundling can work for the production SSR build, but development needs Node to load third-party CommonJS dependencies.

**Why:** the built renderer worked while the development renderer failed on the same React imports.

**How to apply:** distinguish build-time SSR bundling from development module loading. Also dispose request-local React Query caches after rendering; otherwise cache timers can keep short-lived tests or processes alive.
