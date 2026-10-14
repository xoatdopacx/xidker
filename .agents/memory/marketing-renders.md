---
name: Marketing renders (logo, promo video)
description: How the IG logo and promo video are produced and the rendering pitfalls hit while making them.
---

- The logo PNG and the promo video are plain HTML pages in `marketing/` rendered by headless chromium scripts in `marketing/render/` (usage notes at the top of each script). The promo page is a pure function of time, so any frame range can be re-rendered.
- Heavy outputs (site footage, frames, mp4, music) live in `generated-artifacts/promo/`, which is gitignored. Re-render them instead of committing them.

Pitfalls:
- `clip-path: inset(0 …)` cuts off Vietnamese stacked accents on capitals (Á, Ầ) because they rise above the line box. Wipe reveals need negative top and bottom insets.
  **Why:** the first render showed "CÁCH DÙNG" as "CACH DUNG".
- Hide wrapper elements with `display:none`, not `visibility:hidden`. A child set to `visibility:visible` stays visible inside a hidden parent.
- Reels safe area for text: about y 250–1480 and x ≤ 945 on 1080×1920.

Copy rules for promos: use only facts from the site. Show 299.000đ as the only VND price (see pricing rules). Do not write "link in bio".
