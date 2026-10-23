# Michelle bust generator

Builds the low-poly bust in the Michelle template (`templates/michelle/index.html`, the `bust-data` script) from the MakeHuman base mesh and face targets, which are CC0 (public domain). Runs offline with Node; it is not part of the pnpm workspace and is not shipped to buyers.

## Steps

Run everything from this folder.

```sh
npm install                       # meshoptimizer, for this folder only
node fetch-data.mjs               # MakeHuman base mesh + targets -> data/ (not committed)
node gen.mjs pack=out/pack.json   # build the bust and pack it
node splice.mjs                   # put the pack into the template and the live demo copy
```

Then, from the repository root:

1. Rebuild the source zip: `cd templates && rm -f ../artifacts/api-server/assets/templates/michelle.zip && zip -r -X -9 ../artifacts/api-server/assets/templates/michelle.zip michelle`
2. Retake the store pictures `artifacts/api-server/assets/templates/michelle.webp` (1600×1000) and `michelle-thumb.webp` (640×800) from the demo. A database that already added Michelle as a sample keeps its old pictures; replace them in the admin page.

## What gen.mjs does

- `face.mjs`: mixes the three young-female ethnic targets equally and applies the `SCULPT` face targets (bigger eyes, smaller nose, fuller lips, softer chin).
- `gen.mjs`: cuts the bust out of the body, lowers the arms, scales the torso (`bodyK`) for a stylised head-to-body ratio, decimates with meshoptimizer, bakes per-face colours (skin, lips, blush, lash line), makes the blink morph, the hair (combed stripes, bun, two face locks) and the brows.
- `clothes.mjs`: crew-neck tee front panel and rib, the open overshirt with collar, hem bands and chest pockets, shrink-wrapped onto the body with a ray caster.
- Pack format: positions (planar, delta-coded int16, scale `q`), delta-coded indices, blink vertex list and deltas, one RGB byte triple per face, gzip + base64. `buildBust()` in the template reads exactly this layout, so change both together.

Options (`key=value`): `bodyK` (0.88), `teeSpan` (0.85), `crew` (0.07), `strandW` (0.1), `bunR` (0.25), `bunT` (0.15), `armR` (0.5), `blink` (0–1, preview only), `only` (comma-separated part names), `out` (preview JSON, default `out/bust.json`), `pack`.

## Preview

`node gen.mjs` writes `out/bust.json`; `node shoot.mjs out/bust.json out/preview.png` renders it in headless Chromium (`/repl/tools/bin/chromium`) from eight angles. Pass a views JSON as the third argument for other angles, for example `'[{"yaw":35,"pitch":4,"dist":4,"ty":-0.6}]'` (camera yaw/pitch in degrees, distance, target height; `"hero":true` adds the page's slight turn). `node gen.mjs blink=1` previews closed eyes. Head turning, eye movement and blinking are animated by the template, so check those in the page itself.
