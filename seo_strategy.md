# SEO Strategy

## In scope
- xidker public portfolio-source-code sales page (`/`), including 33 supported languages at `/<code>/`.
- Source-detectable WCAG 2.2 A/AA barriers on public sales controls.
- Checkout confirmation (`/cam-on`) only for appropriate search exclusion, not ranking optimization.

## Out of scope
- Authenticated buyer support, admin inbox (`/admin`), API internals and design sandbox (`/__mockup`).
- Marketing asset-production HTML under `marketing/` is not served as public web routes.

## Target audience
- Individuals and commercial buyers looking for ready-made portfolio website source code; Vietnamese and international buyers.

## Primary topics
- Portfolio website source code, ready-made personal portfolio templates, source-code installation and commercial licensing.

## Content and crawler assumptions
- React/Vite sales pages are now server-rendered by `artifacts/web-landing/seo/server.mjs` using `seo/render.tsx`, in development and production. Initial HTML includes translated sales content; fresh Whop catalog prices/features are included when the catalog responds within the server deadline, otherwise the browser fetches them.
- Google can render JavaScript, but social and AI retrieval bots generally do not; keep important content, metadata and navigation in initial HTML.
- Translations use stable URLs with self-canonicals and reciprocal hreflang. `/` is the English default and x-default; `/en/` also renders English.
- Whop supplies the product catalog and hosted checkout. Do not invent business claims, customer proof, addresses or prices. Contact: hello@idkworkshop.com.
- Production origin is explicitly configured in `seo/site.ts` as `https://shopoatdopac.com`, overridable at build time with `SEO_SITE_ORIGIN`; do not infer other domains.
- Utility pages are noindex; unknown page routes return HTTP 404 from the HTML server.

## Dismissed categories
- None.
