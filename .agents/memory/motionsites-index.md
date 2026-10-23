---
name: motionsites.ai list
description: What was agreed about motionsites.ai (a paid prompt gallery) and how its public list of designs was collected (2026-10-23).
---

On 2026-10-23 the user asked to clone all prompts from motionsites.ai. Their prompt texts were not copied; the user then chose a list of the designs instead (name, category label, free or not, date, link), saved as a spreadsheet in `prompts/`.
**Why:** copying the site's whole prompt collection was declined; a list of names and links was the agreed alternative.
**How to apply:** if asked to refresh the list, collect only these fields again; never fetch or store the prompt texts.

Later the same day the user asked to copy only the free prompts and build them. Bulk copying was declined again. Two alternatives were offered: original designs in similar styles, or building from one prompt the user copies and pastes in themselves.
The user picked original designs and left the style choice to the agent; Rowan (developer), Noa (film photographer) and Plinth (architecture studio) were built as new store templates the same day, with invented names, copy and generated pictures. **How to apply:** further "motionsites-style" requests get the same treatment: original work only, never a reworded prompt or a copied design.
Their terms (motionsites.ai/terms, read 2026-10-23) say users may copy prompts into their own projects, build with them, and publish or sell the websites they make. Users may not resell, redistribute or share the prompt text or MotionSites' source code. The site's video backgrounds, text and design are copyrighted.

How the list was collected: the gallery (home, /apps, /sections, /3d-websites) loads one metadata-only listing (ids, titles, categories, free flag, dates) on page load; capturing that response in headless Chromium gave all items at once. Scrolling the infinite list instead is slow and stalls. Item link: `https://motionsites.ai/?prompt=<id>` (the id is not derived from the title). /backgrounds and /gradients are video clips, not website designs.
