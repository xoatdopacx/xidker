# Prompt v2 — Particle Self · Kin OS ("kin-point-cloud-os")

## 0. What to build

A scroll-driven landing page for **Kin OS** (`Kin OS 0.9 · on-device memory`), a privacy-first AI operating system: *"Kin is the operating system that sees you. It asks before it acts."* The hero is a glowing GPU point-cloud portrait that looks at the visitor and parts like liquid under the cursor; the scroll story zooms out to a calm desktop, then dives into the lattice to explain memory and agents.

Deliver a folder that runs with no build step:

- `index.html` — all markup, CSS and JavaScript inline (ES modules), including the bust's shape data.
- `assets/` — four small portrait photos (`person-1.webp` … `person-4.webp`) and one landscape (`place.webp`) for the widgets.
- `README.md` — run, edit, publish.

It must work opened straight from disk, from any static host, and inside a sandboxed iframe (no cookies, no `localStorage`, no network calls besides fonts and the library).

## 1. Stack and loading

- Three.js **r169** (`three@0.169.0`) through an `importmap` from jsDelivr: `three`, plus `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass` from `three/addons/`.
- Google Fonts with `display=swap`: **Inter** 400–700 (UI and body), **Silkscreen** 400 (the stepped pixel half of the hero word), **JetBrains Mono** 400–500 (clock and shortcuts, tabular numerals).
- All copy is plain HTML so the page reads without JavaScript. The page is readable while the 3D engine loads; the bust assembles from scattered points when ready.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg-dark` | `#000000` | WebGL stage |
| `--bg-shell` | `#EBE9F2` | desktop canvas revealed in Scene 2 |
| `--lavender` | `#D6BAFF` | head particles, bars, memory progress |
| `--yellow` | `#E5F33C` | waitlist CTA, "now" bars, shoulder particles |
| `--cyan` | `#5CE6C6` | "Kin is listening" pulse |
| `--glass` | `rgba(30,30,36,.76)` + `backdrop-filter: blur(22px) saturate(140%)` + `1px solid rgba(255,255,255,.09)` | every floating surface |

Squircle-like radii (14–22 px on cards, 999 px on pills). All icons are inline SVG (no emoji, no icon font). Keyboard hints use `<kbd>` in JetBrains Mono.

## 3. Top glass dock (fixed)

`top: 16px`, centred, `height: 50px`, `border-radius: 15px`, dark glass, always above everything:

1. 3×3 pixel-grid launcher (36×36). Opens a small glass panel with shortcuts to the scenes and the waitlist; closes on Escape or outside click.
2. Live clock `HH:MM:SS` in the visitor's local time, tabular numerals, ticking every second.
3. Pulsing cyan dot + `Kin is listening`.
4. Section links `Status`, `Agents`, `Memory` — smooth-scroll to Scene 2, 4 and 3; the link of the current scene is highlighted.
5. `Sign in` (frosted dark) and `Join the waitlist` (neon yellow).

Below 760 px the section links and the listening label hide; launcher, clock, dot and the yellow button stay.

`Join the waitlist` opens a glass dialog with an email field: validates, shows a success state, sends nothing (one clearly marked function to connect a real service). `Sign in` opens the same dialog explaining that sign-in opens to waitlist members first.

## 4. GPU point-cloud bust

- **Shape:** a structured lattice from a real head-and-shoulders model: the public-domain (CC0) MakeHuman base mesh, baked into a cylindrical depth map (one radius per row × angle, 256 rows × 200 angles, angles packed tighter at the face), plus a hair-thickness map from which extra points fill the volume of the curly hair. Both maps ship inside the page, gzip-compressed and base64-encoded (about 45 KB), decoded with `DecompressionStream`. Point brightness is weighted by the lattice cell's area so the denser face does not glow hotter. About 62,000 points on desktop (about 49,000 on the surface, the rest in the hair), half on phones.
- **Points:** crisp square pixels (`gl_PointSize` with size attenuation, no round mask), additive blending, points facing away dimmed using normals estimated from neighbouring lattice points, slow per-point shimmer. A soft key light from the upper left (in the shader) brings out the face. `UnrealBloomPass` (it blurs at half resolution) with strength 0.7, radius 0.45, threshold 0.18: a glow that does not wash out the features. Dark gradient scrims sit between the stage and any text placed over it, so copy stays readable on the bright cloud.
- **Colour by height:** luminous lavender-white `#F2E6FF` → `#CFB0FF` on head and face, warm ivory at the neck, neon chartreuse `#E5F33C` across the shoulders, with a soft glow on the floor beneath.
- **Gaze:** the bust turns toward the cursor (`rotation.y` ±0.45 rad, `rotation.x` ±0.18 rad), damped, with a slow idle drift when the cursor rests.
- **Liquid stirring:** the cursor path is a channel through the cloud, computed in the vertex shader in screen space from the last 10 cursor positions. The channel is widest at the cursor and narrows toward its tail. Points inside move out radially by an area-preserving amount (`sqrt(d² + R²) − d`), so they crowd along the rim instead of disappearing and the rest of the cloud keeps its spacing; the rim wobbles and swirls slightly. Older trail points fade over about 0.8 s, so the channel closes smoothly behind a moving cursor; a resting cursor holds a round void. Touch-drag behaves like the cursor.
- **Entrance:** points start scattered and settle into the bust over about 1.6 s.

## 5. Scroll story (560vh pinned track)

Scroll progress `p` is smoothed (frame-rate-independent, about 120 ms). Native scrolling only.

### Stage 1 · Hero (0–0.22)
- Full-bleed black stage. Giant `HELLO, I'M KIN` behind the bust, full width: `HELL` in a clean geometric grotesk (Inter, tight tracking), `O, I'M KIN` in the stepped pixel font, sharing one baseline.
- Bottom-left: pill `[● Private beta]` + `Kin OS 0.9 · on-device memory`, then the headline `Kin is the operating system that sees you.` / `It asks before it acts.` (second line dimmer).
- Bottom-right: a small "Scroll" hint.

### Stage 2 · Frame zoom-out and floating widgets (0.22–0.52)
- The black stage shrinks into a `56vw × 60vh` rounded window (`border-radius: 26px`) over `#EBE9F2`; the hero copy fades out and the top-centre of the window shows `[● Kin OS] Everything around you, in one quiet place.`
- Seven glass widgets float around the window edges with depth-based parallax (scroll and pointer) and staggered entrances:
  1. **People (4)** photo card with four portraits.
  2. **Add image +** chip.
  3. **Places (9)** landscape card.
  4. **Summarize ⌘S | Rewrite ⌘R | Later L** action bar.
  5. **Focus this week (+12%)** bar chart, seven days, today's bar yellow and labelled NOW.
  6. **✓ Done. Ana has the new time.** toast (the check is an SVG).
  7. Bottom **composer bar** across the window's lower edge, typing and erasing suggestions in a loop after `Ask Kin anything...`, with mic and send icons.

### Stage 3 · Macro head left + on-device memory right (0.52–0.78)
- The window grows back to full screen; the camera dollies into a macro close-up of the lattice, placing the face on the left half so the individual square points read as a structure.
- Right side, first: `[● On-device] Memory`, `Kin remembers, so you don't have to.`, `Everything it keeps stays on your device.`, chips `People` `Places` `Promises` `Preferences`.
- Then it gives way to two cards: **Remembered** (weekly bar chart, `1,201 moments kept · 311 forgotten on request`) and **Where it lives** (`Encrypted`, `On this device 100%` with a lavender progress bar that fills, `Forget anytime ⌘⌫`, `Export ⌘E`).

### Stage 4 · Macro head right + agents left (0.78–1)
- The particles scatter along a curl-noise field as the head pans to the right half.
- Left side: `It acts for you. And it asks before it does.`, chips `Ask Kin ⌘K`, `Summarize ⌘S`, `Later L`, the **Time saved today (2 h 18 m)** card with a 24-hour histogram (the current hour in yellow), and the **Golden time** card (`Needs you · 3`, `78% handled while you focused`) with tick bars.

### After the track
A short closing band on black: `Kin asks before it acts.`, the waitlist button, and a one-line footer.

## 6. Responsive

- ≤ 1100 px: widgets shrink and the two outermost widgets hide.
- ≤ 760 px: the window becomes `86vw × 52vh`; only the People card, the toast, the action bar and the composer stay; Stage 3 and 4 panels stack under a head that sits at the top half instead of left/right; cards are full width.
- Every stage must fit a 360×640 screen without overlapping text.

## 7. Accessibility and fallbacks

- Semantic headings, `lang="en"`, visible focus rings, a skip link, dialog with focus trap and Escape.
- Clock seconds are hidden from screen readers (`aria-hidden`), the hero word is decorative (`aria-hidden`) with a visually hidden `h1`.
- `prefers-reduced-motion`: no scatter, shimmer or typing loop, widgets appear without parallax, the dolly is replaced by crossfades.
- No WebGL: a still radial glow stands in for the bust and moves where the head would be in each stage (left for Memory, right for Agents, upper half on phones); all content still works.

## 8. Performance

- One renderer, pixel ratio capped at 1.75 (1.25 on phones), bloom at half resolution, all per-point motion in the vertex shader (no per-point CPU work), nothing rendered when the stage is off screen or the tab is hidden.
- Target 60 fps on a 2020 laptop.

## 9. Done when

- The bust appears from scattered points, looks at the cursor, and a cursor pass opens a void that heals smoothly.
- Scrolling shrinks the stage into a window with seven parallax widgets, then dives into a macro lattice for Memory and pans across for Agents, ending at the closing band.
- Dock clock ticks, links jump to the right stage and highlight, the launcher and the waitlist dialog work with mouse and keyboard.
- Works at 1440×900, 1024×768, 390×844 and 360×640, with reduced motion and without WebGL, with no console errors.
