---
name: Security headers and CSP
description: What the live-site header scan can and cannot fix, and how to verify the CSP with the Whop pixel running.
---

The page CSP is enforced only on the published site, so a missing host breaks the live site while the preview looks fine.

**Why:** framing and script rules would break the workspace preview, so dev runs without them. A header scan of the live site (2026-10-14) flagged the hosting's `GAESA` cookie and `Server: Google Frontend` header; neither can be changed from the app.

**How to apply:** after adding any outside script, font, image host, API call or iframe, verify against a local production build in headless chromium that loads `https://shopoatdopac.com/...` with page and `/api` requests answered locally through CDP Fetch, and log `securitypolicyviolation` events from an init script. Let only GET `t.whop.tw/*.js` through and fail every other Whop request, so no event reaches Whop. Whop's `sc.js` builds a blob worker, which is why `worker-src blob:` is in the policy. If COEP is requested, explain that it would block Google Fonts and the Whop pixel.
