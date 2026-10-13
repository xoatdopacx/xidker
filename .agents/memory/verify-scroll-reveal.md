---
name: Verifying scroll-revealed sections
description: How to visually check content below the fold and scroll-driven animation on this landing page (Screenshot tool limitation), plus a montage trick for reviewing many captures at once.
---

The Screenshot tool cannot scroll, and its full-page mode leaves scroll-revealed sections blank (cards only build on a real scroll). Hash URLs like `/#bang-gia` did not scroll either.

Filming transitions: the visuals are CSS animations, but the scene-transition phases and the card-build fail-safe run on JS timers, so slowing CSS with `Animation.setPlaybackRate` puts them out of sync. Instead, burst-capture JPEG frames in real time (about 70ms apart) and montage them. A MutationObserver on the overlay's `data-phase` gives an exact phase timeline. To film a card build, make it the first scroll after a fresh load: any earlier scroll finishes the cards it passes, so they show no animation.

Workaround that worked: spawn `/repl/tools/bin/chromium --headless=new --no-sandbox --remote-debugging-port=<port>`, connect with Node's global WebSocket to the page target from `/json/list`, `Page.navigate` to `http://localhost:80/`, `Runtime.evaluate` a `window.scrollTo({behavior:"instant"})` (the site sets `scroll-behavior: smooth`), wait ~1-2s, `Page.captureScreenshot`. `Emulation.setDeviceMetricsOverride` gives a phone viewport; `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce` checks the reduced-motion path. The UI language can be forced through `Page.addScriptToEvaluateOnNewDocument` setting the saved-language key before load (headless defaults to an English browser language). Clicking a buy button the same way confirmed the real redirect to Whop checkout.

To put the road character at a chosen point, scroll so that `innerHeight * 0.62` lines up with that point's position inside the road container. The character follows the line at 62% of the viewport height.

Montage trick: to review many small captures in one image read, capture each one with `Page.captureScreenshot` + `clip` (base64 PNG). Then navigate to `about:blank`, inject a CSS grid of `<img src="data:image/png;base64,...">` with captions, and capture once.

CDP gotchas hit later: `Page.captureScreenshot` `clip` x/y are page coordinates, so on a scrolled page add `scrollX/scrollY` or the capture shows only the green background. Retry captures that fail with "Not attached to an active page" during navigation. `localStorage` throws on `about:blank`; navigate to the site before touching it. Background jobs started with `&` inside a shell call die when the call returns; use the background-task option instead. Helper scripts in `/tmp` do not survive across sessions, so rebuild a small launch/evaluate/shot/click/montage helper when needed.

If WebGL is ever needed again in headless mode: drop `--disable-gpu` and add `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.

**Why:** pricing cards with live data, checkout navigation, the road character's per-leg vehicles and the FAQ height check could only be confirmed this way.
**How to apply:** any time a change affects content below the first viewport of this landing page or anything driven by scroll position.
