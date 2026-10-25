# idk portfolio

A dark, cinematic one-page portfolio for a creative-engineering studio (idk workshop). A real-time 3D ocean at dusk, built with three.js, runs behind the whole page: a 4-octave simplex swell, two drifting ripple normal maps, Fresnel sky reflections, and a softly compressed sun glint. A glowing lantern skims the water. It follows the mouse or pen and returns to its own route when the pointer rests, while a GPU height-field simulation (two floating-point framebuffers used in turn) draws its V-shaped Kelvin wake and foam. The control bar under the hero changes the lantern speed, wave height, and camera altitude, with three presets, and the camera rises as the page scrolls. Also included: a loading screen, smooth scrolling (Lenis), a custom cursor, project cards, a capabilities grid, and an FAQ that opens in place. Plain HTML, CSS, and JavaScript modules, with no build step.

## Run locally

The page loads its scripts as JavaScript modules, which browsers only allow from a web server. Opened straight from the folder, `index.html` shows the page with a still sea instead of the 3D ocean. Run the included server from this folder:

```sh
python3 serve.py
```

On Windows, use `py serve.py`. Open **http://localhost:8080/**; for another port, run `python3 serve.py 8000`. Stop the server with Ctrl+C. Any static server works too, as long as it sends `.js` files as JavaScript. There is no npm install or build step. The fonts, three.js, and Lenis are bundled, so the page also works offline.

The 3D ocean needs WebGL2, which current desktop and mobile browsers have. Without it, the page keeps a still dusk sea and hides the ocean controls. On phones and machines with few processor cores, the wake simulation and the water mesh use fewer cells, and the picture sharpness adjusts itself to keep the motion smooth. The ocean stops drawing while it is scrolled out of view. With reduced motion turned on, the ocean moves slowly, the camera stops swaying, and the smooth scrolling and hero reveal are switched off.

## Edit

- **Text and links:** everything is in **`index.html`**, in blocks marked `1. HERO SECTION` to `6. FOOTER`. The browser-tab title and description are in `<head>`.
- **Email:** `hello@idkworkshop.com` appears in the header button, the "Request Full Archive" button, the third FAQ answer, and the footer (link and text). Replace every one.
- **Projects:** the four cards under `3. SELECTED WORKS ARCHIVE`. Their pictures are `assets/works/work-01-aether.svg` to `work-04-solaris.svg` (1200×800). Any SVG, WebP, or JPEG works; it is cropped to fill a 16:10 frame. Update the `alt` text of each `<img>`.
- **Claims:** the copy describes idk workshop's services. The page description, one project badge, and one capability card mention GSAP, which this template does not include (its scrolling is Lenis plus its own code). Keep, change, or remove those lines to match what you offer.
- **Colours and fonts:** the page colours are the variables at the top of `css/style.css`. The font files are in `fonts/` and declared in `css/fonts.css`.
- **The ocean:** `OCEAN_SETTINGS` at the top of `js/ocean/index.js` holds the sky, water, foam, and lantern colours, the sun position, the swell and ripples, the wake simulation, the lantern's route, the camera range, and the sharpness limits; each line has a short note. The shaders are in `js/ocean/shaders.js`.
- **Presets and timing:** the top of `js/app.js` holds `SETTINGS` (loading-screen and reveal timings, how far the camera rises while scrolling) and `OCEAN_PRESETS` (the values behind Calm Horizon, Deep Voyage, and Kinetic Swell). If you change a slider's range in `index.html`, keep the presets inside it.
- **Trying values live:** in the browser console, `__idkOcean` is the running ocean, for example `__idkOcean.setSwell(2.6)` or `__idkOcean.setAltitude(30)`. The comment at the top of `js/ocean/index.js` lists every method.
- **Layout:** the responsive rules are at the end of `css/style.css` (1024, 640, 480, and 360 px and below).

## Publish

Upload the folder to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or your web server; `serve.py` and the README files are not needed there. No build command, backend, cookies, or local storage are needed. All paths are relative, so the page also works from a subfolder. If your host adds a Content Security Policy, allow the inline import map in `index.html` (an inline script) and inline styles. In a sandboxed iframe, allow scripts and serve the files with `Access-Control-Allow-Origin`, because module scripts and fonts are then loaded from another origin.

The studio name, projects, figures, and email are idk workshop's own; replace them with yours before publishing. The fonts (Syne, Plus Jakarta Sans, JetBrains Mono) are under the SIL Open Font License, with the licence files in `fonts/`. three.js r186 and Lenis 1.3.27 are under the MIT License, with the licence files in `vendor/`. The ocean code in `js/ocean/` was written for this template.
