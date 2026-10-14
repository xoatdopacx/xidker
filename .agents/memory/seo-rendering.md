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

The first publish with the SSR server failed at promotion: the build passed, then "Creating Autoscale service" repeated for about 10 minutes and ended in "failed to initialize". The deployment had no runtime logs. The cause was the home page answering 503 when its catalog fetch through `localhost:80` failed. The publish startup check calls `/`. The deployment logs, which appeared later than the build logs, confirmed the cause. In the deployed container both services run side by side on their own ports (18500 and 8080), and `/api/healthz` answered 200. Every fetch from the web process to `localhost:80` still failed with "fetch failed", so nothing is listening on `localhost:80` there.

**Why:** dev always has the router on `localhost:80`, so the problem only shows up after publishing. Locally, `/` returned 200 until a catalog outage was simulated. The build record's own log only showed "Creating Autoscale service" retries, so also check `fetchDeploymentLogs` again a few minutes later.

**How to apply:** `/` must never return an error because a dependency is down: render without prices and let the browser fetch them. Server-to-server calls in production use the API's declared port, not `localhost:80`. Reproduce a production failure with a local production build (it needs `PORT` and `BASE_PATH`), run `node --import <preload>` that rejects `fetch`, and curl `/`.

A second publish then failed in exactly the same way, although the fix was finished. That publish had started (2026-10-14, 11:57 local) before the fix was on disk. Its build log listed the same hashed bundle names (`assets/index-<hash>.js`) as the first failed build, a local build of the fixed code produced different names, and its runtime log only showed the old error path.

**Why:** the user can click Publish while the agent is still working, and the publish uses the files as they were when it started.

**How to apply:** when a publish fails again after a fix, compare the bundle names in the build log with a local production build, and look for log lines only the new code prints, before changing code again. Replit's docs give the startup check on `/` five seconds, so the server-side catalog wait must stay well below that (it is 3 s).

`node --test` on `ssr.test.mjs` or `seo.test.mjs` takes about 100 s to exit even though the tests themselves finish in a few seconds. It is not a hang; wait for it.
