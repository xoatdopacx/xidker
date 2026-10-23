---
name: Michelle 3D bust
description: How the Michelle template's bust is made, what the user rejected, and the pitfalls hit while rebuilding it (2026-10-23).
---

The user called the first bust (built from Three.js primitives in code) "quá xấu" on 2026-10-23. It was rebuilt as a stylised low-poly bust from the CC0 MakeHuman base mesh, generated offline by the tool in `tools/michelle-bust/` (its README has the steps). MakeHuman files are downloaded by its fetch script and are not committed.
**Why:** the user's request; a generated 3D model (generate3DModel) can't turn its head, move its eyes or blink, which the template needs.
**How to apply:** for any change to her look, edit the generator and re-run it; do not hand-edit the packed data. The pack layout and `buildBust()` in the template must change together.

Pitfalls already paid for:
- three.js morph deltas need `geometry.morphTargetsRelative = true`; without it the face collapses (vanishes) while blinking.
- Arm-lowering weights must use distance to the arm axis, not |x|, or the torso folds.
- Clothes: offset shells, U-cut necklines, azimuth-bin envelopes and a full-ring tee all failed (poke-through); the working method is a front tee panel + separate rib ring + overshirt shrink-wrapped with a ray caster.
- High hair gloss shows as white facets under the rim light; keep hair roughness about 0.8.
- Buyers recolour through `BUST_COLORS` (scales the baked colours), so keep base colours in sync with the generator.
