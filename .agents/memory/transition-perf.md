---
name: Scene transition performance lessons
description: Why the pixel scene/language transition is built the way it is (compositor-driven card, deferred font stylesheet, pooled canvases), how lag was found, and the unexplained dev-overlay error.
---

- Anything that must keep moving during a language switch has to be a compositor animation queued up front (WAAPI with delays, `fill: forwards`, `steps()` easing), not JS timers. The switch blocks the main thread for 300-500 ms in headless Chrome (text layout with fallback fonts, then again when the web font arrives; CJK is worst).
  **Why:** timer-driven bar steps visibly froze mid-load; after the change, filmed frames show the bar advancing while long tasks run.
  **How to apply:** any new loading/hold visual on the transition card.
- Adding a font stylesheet `<link>` restyles the whole page (~50 ms style + layout). Never do it while a visible animation runs on the main thread; it is done under the covered screen.
- Wrapping the language commit in `startTransition` splits the ~90 ms React render into slices.
- Reuse canvases from a pool; allocating them cost more than drawing (earlier per-snapshot canvases caused the hitches).
- Finding lag: a CDP trace grouped by event name per long task (UpdateLayoutTree / Layout / FunctionCall) located each stall; LoAF entries alone only say that a frame was long.
- Dev overlay "(unknown runtime error)": the Replit runtime-error plugin shows this for any window `error` event whose `error` is not an Error (e.g. ResizeObserver loop notices, cross-origin "Script error.") or a non-Error rejection. Seen once on zh-TW at desktop width (October 2026) but never reproduced in headless runs: fresh loads at 1280/1440/1920, many switches in a row, and the 404/thank-you pages. It does not affect the published site.
