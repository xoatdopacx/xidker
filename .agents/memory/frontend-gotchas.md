---
name: Frontend gotchas
description: CSS cascade traps in the web-landing app (Tailwind v4 layers vs the plain classes in index.css).
---

- Tailwind v4 puts utilities in `@layer utilities`, while the custom classes at the end of `src/index.css` (`.adm-*`, `.pbtn`, `.tile`...) are unlayered, so they win over any utility regardless of specificity. A `md:hidden` on an `.adm-btn` (which sets `display`) or `pe-9` on an `.adm-field` (which sets `padding`) silently does nothing.
  **Why:** the admin back buttons showed on desktop and the price fields ignored their end padding until fixed with plain CSS rules.
  **How to apply:** when a utility must change a property that a custom class sets, add a small plain CSS rule (or modifier class) next to the custom class instead.
- Pixel art that shares one picture must share one pixel size: build decor as scene-art compositions sized by `--sp` rather than mixing in fixed-`px` sprites, which drift to a different pixel size at each breakpoint.
  **Why:** the first 404 meadow mixed both and looked patchy; rebuilt with `--sp`-only vignettes it read as one world.
  **How to apply:** any new decorated area (meadow, road extras); a new small group of props is just a new SCENES entry.
- In a flex container with `flex-direction: column`, `flex-basis: 100%` sets the item's height, not its width. To force an item onto its own full-width line in a footer that switches between row and column, use `inline-size: 100%`.
  **Why:** the picker's error box filled the whole column footer on phones until this was changed.
  **How to apply:** any wrapping footer or toolbar whose direction changes at a breakpoint.
