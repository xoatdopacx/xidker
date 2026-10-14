---
name: Frontend gotchas
description: CSS cascade traps in the web-landing app (Tailwind v4 layers vs the plain classes in index.css).
---

- Tailwind v4 puts utilities in `@layer utilities`, while the custom classes at the end of `src/index.css` (`.adm-*`, `.pbtn`, `.tile`...) are unlayered, so they win over any utility regardless of specificity. A `md:hidden` on an `.adm-btn` (which sets `display`) or `pe-9` on an `.adm-field` (which sets `padding`) silently does nothing.
  **Why:** the admin back buttons showed on desktop and the price fields ignored their end padding until fixed with plain CSS rules.
  **How to apply:** when a utility must change a property that a custom class sets, add a small plain CSS rule (or modifier class) next to the custom class instead.
