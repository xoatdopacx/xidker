---
name: idk portfolio ocean
description: Lessons from tuning the idk-portfolio template's 3D ocean (wake, foam, sky) and how to check it in headless chromium.
---

Lessons from renders (2026-10-25):
- The lantern's push on the wake simulation must be a pure dipole (push ahead, pull behind). A net-negative push dug a deep hole inside the V.
- A pulsing push (a few Hz) is what draws the crests across the inside of the V; a steady push only draws the rim.
- Churn must be smooth noise. Random values per cell showed up as square blocks of foam.
- Foam detail must not come from the ripple map at high frequency: its mipmaps alias into a crosshatch. Per-vertex values thresholded per pixel show the mesh grid.
- A steep-foam threshold near the noise floor floods the water white; wide sky-glow terms turn the whole sky pink; a visible sun disc turns grey under the page vignette, so the sun sits just below the horizon.
**Why:** each of these was seen in renders and fixed.
**How to apply:** after changing the ocean's look, render the default and the storm preset, then zoom into the foam.

Checking it: `marketing/render/cdp.mjs` `launch({ webgl: true })` gives chromium with software WebGL. Replace requestAnimationFrame with a fixed 30 fps clock so the motion does not depend on the slow renderer, and lock the sharpness with `__idkOcean.setPixelRatio(1, { lock: true })`, because the automatic sharpness drops under software rendering. Headless chromium reports no fine pointer, so the custom cursor never shows there.
**Why:** without the fixed clock and lock, captures were blurry and their timing changed from run to run.
**How to apply:** use this setup for previews and visual checks of any WebGL template.
