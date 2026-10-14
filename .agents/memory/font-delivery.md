---
name: Font delivery policy
description: Performance tradeoff for base typography versus language-specific font loading.
---

Prioritize readable system fallback text over waiting for the base web fonts. Keep language-specific fonts selective, and preserve the covered-screen timing of language switches.

**Why:** the font-loading work addresses a source-confirmed render-blocking dependency, not a measured LCP delay. Asynchronous base typography avoids that dependency without changing the pixel-art design or fetching every writing system up front. Font swapping may still trigger layout; do not claim measured speed or layout-shift improvements without measurements.

**How to apply:** future font changes should not reintroduce external CSS imports in the application's blocking stylesheet or preload all families. `display=swap` alone does not make a stylesheet non-blocking.
