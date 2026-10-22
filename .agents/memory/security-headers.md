---
name: Security headers and CSP
description: What the live-site header scan can and cannot fix, how to verify the page CSP, and the separate demo-page policy.
---

The page CSP is enforced only on the published site, so a missing host breaks the live site while the preview looks fine.

**Why:** framing and script rules would break the workspace preview, so dev runs without them. A header scan of the live site (2026-10-14) flagged the hosting's `GAESA` cookie and `Server: Google Frontend` header; neither can be changed from the app.

**How to apply:** after adding any outside script, font, image host, API call or iframe, verify against a local production build in headless chromium that loads `https://shopoatdopac.com/...` with page and `/api` requests answered locally through CDP Fetch, and log `securitypolicyviolation` events from an init script. If COEP is requested, explain that it would block Google Fonts. (The Whop pixel and its `t.whop.tw` / blob-worker allowances left with Whop on 2026-10-22.)

The template demos under `/demo/<slug>/` get their own sandbox policy (`DEMO_CSP`), in dev as well, so a broken demo shows up in the preview. Iris's 3D loader failed until `connect-src` allowed `data: blob:`.
**How to apply:** after changing a template demo, open all four demos at desktop and phone size and read the console; the only expected noise is a favicon request and Jack's 404 GIF.
