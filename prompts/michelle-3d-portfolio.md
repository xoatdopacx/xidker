# Prompt v2 — Michelle · Playful Dimensions ("michelle-3d-portfolio")

## 0. What to build

A scroll-driven portfolio for **Michelle**, a 3D designer who turns curious ideas into playful objects. One continuous story in four scenes: a hero with a faceted low-poly 3D bust and physics leather balls, a flight through a white gallery corridor, an interactive list of selected work, and a contact screen where the balls come back.

Deliver a folder that runs with no build step:

- `index.html` — all markup, CSS and JavaScript inline (ES modules).
- `assets/` — the three project renders as `.webp`, 16:10, about 1000 px wide (1024×640 or 944×590; the preview card is at most 520 px wide, so this stays sharp on 2× screens) (`quiet-orbit.webp`, `little-listener.webp`, `soft-switch.webp`).
- `README.md` — run, edit, publish.

It must work opened straight from disk, from any static host, and inside a sandboxed iframe (no cookies, no `localStorage`, no same-origin access, links open in a new tab).

## 1. Content and editing

- All copy is plain HTML in clearly commented blocks, so the page reads without JavaScript and search engines see it. JavaScript reads data attributes; nothing is written twice.
- Each project row is an `<a>` with `href`, `data-image` and `data-alt`.
- Each social link in the footer carries `data-ball-color` and `data-ball-glyph`; the physics balls are built from those links.
- Placeholder email: `hello@example.com`. Placeholder links: `#`.

## 2. Stack and loading

- Three.js **r169** (`three@0.169.0`) through an `importmap` from jsDelivr, plus `three/addons/renderers/CSS3DRenderer.js`. No other libraries; the physics is a small hand-written 2D solver.
- Google Fonts with `display=swap`: **Anton** 400 for every display line; **Antonio** 500–700 for tags, labels and the footer.
- Measure text for physics and 3D only after `document.fonts.ready` (give up waiting after 2.5 s) and again on resize.
- The page is fully readable while the 3D engine loads; the bust rises into place when ready.

## 3. Look

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | gallery white |
| `--ink` | `#0A0A0A` | type |
| `--muted` | `#A6A5A1` | inactive rows, meta |
| `--line` | `#D8D7D3` | 1 px dividers |
| rooms | `#8E9EC7` periwinkle · `#D68C72` terracotta · `#97A882` sage · `#CCA862` ochre | corridor rooms |
| balls | `#151518` X · `#E52229` Pinterest · `#1456F0` Behance | leather |

Type scale: top headline `clamp(64px, 11.7vw, 196px)` / line-height 0.88 · manifesto `clamp(20px, 2.52vw, 41px)` uppercase · bottom headline `clamp(58px, 10.75vw, 182px)` · project titles `clamp(44px, 7.4vw, 120px)` · contact headline `clamp(72px, 14.2vw, 224px)` · tags and labels Antonio 600, 13–15 px, letter-spacing 0.08em, uppercase.

All arrows and icons are inline SVG (no emoji, no icon font).

## 4. Scroll architecture

- A **540vh** track with a sticky 100vh stage. Scroll progress `p` (0→1) comes from the track; every animation reads a smoothed copy (frame-rate-independent damping, about 120 ms), so wheel scrolling feels fluid and scrollbar drags stay exact. Native scrolling only, no hijacking.
- Scene windows: **Hero** 0–0.18 · **Morph** 0.18–0.30 · **Corridor** 0.30–0.55 · **Work** 0.55–0.82 · **Contact** 0.82–1.
- One `WebGLRenderer` and one `CSS3DRenderer` share one camera. World units equal CSS pixels on the corridor's entrance plane, so the corridor opening matches the viewport exactly and DOM text can hand over to 3D with no visible jump.
- Render WebGL only while the bust or the corridor is on screen.
- Scene layers switch with opacity and `pointer-events`, never `display: none`, so their text stays measurable for the hand-overs. Keyboard focus on a link in another scene scrolls to that scene.

## 5. Scene 1 — Hero (0–0.18)

Layer order, back to front: top headline + manifesto → transparent 3D canvas → bottom headline → balls.

- **"HI, I'M MICHELLE"** across the top-left.
- **Manifesto**, left middle, four lines: `CURIOUS IDEAS BECOME PLAYFUL OBJECTS.` / `SMALL WORLDS SHAPED THROUGH FORM,` / `TACTILE MATERIALS AND LIGHT.` / `A LITTLE MOTION BRINGS THEM TO LIFE.`
- **"PLAYFUL DIMENSIONS"** along the bottom edge. It tilts toward the pointer in 3D (`perspective(900px)`, rotateX ±8°, rotateY ±10°, skewX ±6°, damped) and is the floor for the balls: the collider is the top of its capital letters, projected through the current tilt, so balls roll when it leans.
- **Bust** on the right half, in front of the top headline and behind the bottom one. Stylised low-poly bust built offline from the CC0 MakeHuman base mesh, flat shaded (about 5k triangles), packed into the page as gzip + base64 data and unpacked with `DecompressionStream`, so it still works from `file://` and in a sandboxed iframe:
  - faceted head decimated from the base mesh with a softened, stylised face; warm skin facets (`#E8B48E`, small per-face variation, light blush), clean lip outlines, a dark lash line on each upper lid;
  - eyeballs with white sclera, brown iris `#5B3A24`, black pupil, a dark socket behind each lid; the upper lids close as a morph target to blink every 3–6 s;
  - dark espresso hair `#3A2418` in chunky combed stripes, a coiled top bun and two face-framing locks; dark brows;
  - grey crew-neck tee `#9A9BA0` with a ribbed neckline, open navy-slate overshirt `#33415C` shrink-wrapped over the shoulders, with a pointed collar, hem bands and two flap chest pockets; arms hang down, torso slightly smaller than realistic so the head reads larger.
  - Skinned with three bones: chest (still), neck (35% of the turn) and head (65%); hair, brows and eyes ride on the head bone. Main colours are editable in `BUST_COLORS`.
  - Light: warm key top-right, cool fill left, white rim from behind, soft hemisphere; neutral tone mapping.
  - The head turns toward the pointer around a neck pivot (yaw ±30°, pitch ±14°, damped); the eyes lead by up to ±15°. After 4 s without pointer movement it drifts into a slow idle look. Subtle breathing. On touch screens it follows the last touch.
- **Leather balls** for X / Twitter, Pinterest and Behance (glyphs `X`, `P`, `Bē`). Radius `clamp(34px, 4.6vw, 84px)`. They drop from above the viewport shortly after load, bounce (restitution 0.55 on the floor, 0.85 between balls), roll with friction, spin with their motion, collide with each other and the screen edges, and settle on the bottom headline.
  - Pointer: moving through a ball kicks it with the pointer's velocity (capped). Balls can be dragged and thrown; a click without dragging opens the profile in a new tab.
  - Fixed 120 Hz physics step with an accumulator; balls sleep when at rest.
  - Look: a DOM element with a static leather grain, a rotating layer (two curved panel seams with a dark groove, a light lip and cream dashed stitches, plus the white glyph) and a fixed shading layer (highlight top-left, darker rim bottom-right, specular dot); a soft contact shadow that shrinks with height.

## 6. Scene 2 — Morph and corridor (0.12–0.55)

- 0.12–0.20: the bust slides right and out of frame; the balls lose their floor and fall out through the bottom; the headline tilt eases back to flat.
- 0.14–0.18: the manifesto fades out.
- 0.18–0.30: the page folds into a corridor. Both headlines hand over to WebGL text planes at the same pixels (canvas textures drawn from the live HTML headline: its font, size, colour and each word's measured position, with a margin of about 20% of the font size so accents are not clipped), then hinge 90°: **"HI, I'M MICHELLE"** around its top edge onto the ceiling, **"PLAYFUL DIMENSIONS"** around its left edge onto the left wall. The corridor rises out of white fog.
- Corridor: matte white floor, walls and ceiling with soft corner shading, slim ceiling light strips and light pools on the floor. Two pairs of pointed-arch doorways with real wall thickness, after the wall text: left Periwinkle then Sage, right Terracotta then Ochre. Each opens into a sunlit room in its colour with a bright window, a white pedestal and a slowly turning sculptural object, and spills a tinted light patch onto the corridor floor.
- 0.20–0.55: the camera dollies to the end wall with a gentle bob and up to ±2° of look toward the pointer.
- End wall: the **SELECTED WORK** sheet hangs in a thin black frame as a CSS3D copy of the real Work layer. Its on-screen size follows the camera and reaches exactly the viewport at p = 0.55, where it hands over to the real Work layer with no visible change.

## 7. Scene 3 — Selected work (0.55–0.82)

- Header row: `SELECTED WORK` left, `3D OBJECTS & LITTLE WORLDS` right.
- Three rows with 1 px `#D8D7D3` dividers, each a link: title, tags, kind + arrow.
  1. **Quiet Orbit** — Art direction / 3D / Materials — Object study (concentric oak gimbal rings, white ceramic and blue planet spheres, sunlight through blinds).
  2. **Little Listener** — 3D / Product / Lighting — Sound sculpture (wooden acoustic horn, coiled brass tube, oak body, terracotta knob).
  3. **Soft Switch** — 3D / Colour / Surface design — Tactile experiment (matte cobalt controller in an oak cradle, braided white cord, three cream buttons, glossy orange ball lever).
- Active row: ink colour, title skewed `skewX(-10deg)`, arrow slides in. Scrolling activates rows one by one (0.56–0.80); hovering or keyboard focus overrides.
- Preview card: 16:10, `clamp(260px, 30vw, 520px)` wide, with a soft drop shadow; images crossfade between projects (0.45 s). At rest it sits at the right edge beside the active row (below the first row, above the second and third) and glides there with damping when the active row changes, never covering the active title. While a mouse hovers a row it follows the pointer with damping and leans up to ±6° with pointer speed. On phones (≤ 640 px) it sits inline between the header and the rows.
- Caption bottom-left: `MATERIAL, LIGHT, A LITTLE CURIOSITY.`

## 8. Scene 4 — Contact (0.82–1)

- 0.82–0.88: the Work sheet lifts away upward like a curtain, revealing the contact screen.
- Giant `Want to` / `reach out?` on the left; on the right an arrow + `hello@example.com` mail link with a 2.5 px black underline that redraws on hover.
- Footer row with a top rule: `X / TWITTER`, `PINTEREST`, `BEHANCE` (the real links) and a small copyright line.
- From p ≥ 0.86 the three balls drop again from the top, each above its label, and bounce to rest on the footer rule. Scrolling back up clears them; the hero drops them again when you return to the top.

## 9. Responsive

- ≤ 900 px: the bust moves lower and further right, partly behind the bottom headline.
- ≤ 640 px: both headlines wrap to two lines (`HI, I'M` / `MICHELLE`, `PLAYFUL` / `DIMENSIONS`); the manifesto sits under the top headline; balls get smaller; work rows stack their meta under the title; the preview card sits inline; the contact headline and email stack.
- Every scene must fit a 360×640 screen without overlapping text.

## 10. Accessibility and fallbacks

- Semantic headings (`h1` for the name, `h2` per scene), a skip link to the work list, visible focus rings, `lang="en"`.
- The physics balls are decorative copies (`aria-hidden`, not focusable); the footer links are the real ones.
- `prefers-reduced-motion`: balls rest in place with no physics, no headline tilt or idle head motion, and the corridor flight is replaced by short crossfades between scenes.
- No WebGL: the bust and corridor are skipped and scenes crossfade; everything else works.

## 11. Performance

- One renderer, pixel ratio capped at 2 (1.5 on phones), no post-processing, geometry built once and rebuilt only on resize.
- Physics runs only while balls are awake; WebGL renders only in the Hero, Morph and Corridor scenes; nothing runs in a hidden tab.
- Target 60 fps on a 2020 laptop; no layout reads inside the animation loop except cached rects.

## 12. Done when

- Balls drop, bounce, roll, collide, can be kicked, dragged and thrown, and come to rest on the tilted headline.
- The bust follows the pointer with head and eyes and blinks.
- Scrolling folds both headlines onto the ceiling and wall, flies past four coloured rooms and lands on a sheet that becomes the real Work list with no jump.
- Rows respond to scroll, hover and keyboard; the preview card follows and crossfades.
- The contact screen brings the balls back onto the footer.
- Works at 1440×900, 1024×768, 390×844 and 360×640, with reduced motion, and without WebGL, with no console errors.
