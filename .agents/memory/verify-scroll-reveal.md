---
name: Verifying scroll-revealed sections
description: How to visually check content below the fold when sections only appear on scroll (Screenshot tool limitation).
---

The Screenshot tool cannot scroll, and its full-page mode leaves scroll-revealed sections blank (IntersectionObserver never fires). Hash URLs like `/#bang-gia` did not scroll either.

Workaround that worked: spawn `/repl/tools/bin/chromium --headless=new --no-sandbox --disable-gpu --remote-debugging-port=<port>`, connect with Node's global WebSocket to the page target from `/json/list`, `Page.navigate` to `http://localhost:80/`, `Runtime.evaluate` a `window.scrollTo({behavior:"instant"})` (the site sets `scroll-behavior: smooth`), wait ~2s, `Page.captureScreenshot`. `Emulation.setDeviceMetricsOverride` gives a phone viewport. Clicking a buy button the same way confirmed the real redirect to Whop checkout.

For the three.js hero to actually render in that headless browser, drop `--disable-gpu` and add `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` (gives WebGL2). The UI language can be forced through `Page.addScriptToEvaluateOnNewDocument` setting the saved-language key before load (headless defaults to an English browser language).

**Why:** needed to verify pricing cards rendered with live data and that checkout actually navigates.
**How to apply:** any time a change affects content below the first viewport of this landing page.
