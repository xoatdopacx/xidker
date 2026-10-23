---
name: motionsites.ai list
description: What was agreed about motionsites.ai (a paid prompt gallery) and how its public list of designs was collected (2026-10-23).
---

On 2026-10-23 the user asked to clone all prompts from motionsites.ai. Their prompt texts were not copied; the user then chose a list of the designs instead (name, category label, free or not, date, link), saved as a spreadsheet in `prompts/`.
**Why:** copying the site's whole prompt collection was declined; a list of names and links was the agreed alternative.
**How to apply:** if asked to refresh the list, collect only these fields again; never fetch or store the prompt texts.

How the list was collected: the gallery (home, /apps, /sections, /3d-websites) loads one metadata-only listing (ids, titles, categories, free flag, dates) on page load; capturing that response in headless Chromium gave all items at once. Scrolling the infinite list instead is slow and stalls. Item link: `https://motionsites.ai/?prompt=<id>` (the id is not derived from the title). /backgrounds and /gradients are video clips, not website designs.
