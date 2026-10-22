# Mainframe

A single-screen creative-agency hero built with React, TypeScript, Vite, and Tailwind CSS 3. It includes a mouse-scrubbed video, typewriter greeting, responsive navigation, and copy-email pill. No backend, cookies, or browser storage.

## Run locally

Install **Node.js 20.19+** (a current LTS version is recommended). Unzip the template, open a terminal in this folder, then run:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. To check the production version:

```sh
npm run build
npm run preview
```

## Change the content

- **Text and links:** `src/content.ts` — edit `BRAND`, `INTRO_LINES`, `GREETING`, `EMAIL`, `NAV_LINKS`, `CONTACT_LINK`, and `ACTION_LINKS`. The brief did not supply navigation/pill destinations, so their default `href` values open email enquiries. Replace those values with your own links before publishing.
- **Video:** `src/content.ts`, `VIDEO_URL`. The original URL is kept as the first source. It uses HEVC, so `VIDEO_FALLBACK_URL` points to an identical H.264 copy at `src/assets/mainframe-h264.mp4` for browsers without HEVC support. When changing the footage, update both sources. To bundle your own file, add `src/assets/background.mp4` and set these URLs to `new URL('./assets/background.mp4', import.meta.url).href`. There are no image assets in this design.
- **Fonts:** the two stylesheet links in `index.html`; the matching font-family variables are at the top of `src/index.css`.
- **Layout and colours:** `src/components/Navbar.tsx`, `Hero.tsx`, and `ActionPills.tsx` contain the Tailwind classes; `src/index.css` contains the blur, text sizing, and animations.
- **Timing:** `src/hooks/useTypewriter.ts` has the 38 ms / 600 ms defaults; `src/components/ActionPills.tsx` has the 400 ms reveal; `src/hooks/useMouseScrub.ts` has the `0.8` sensitivity.

The supplied fonts and original video need internet access; the compatibility video is included. Check the media/font licensing and hosting availability before selling or publishing your own version. The video stays paused on touch-only devices, as specified. Clipboard permissions depend on the browser; a copy fallback and selectable email handle restricted embeds. A sandboxed iframe without `allow-same-origin` also needs its host to allow CORS for the template's scripts, styles, and media.

## Publish

Run `npm run build`, then upload **the contents of `dist/`** to any static host (for example Netlify, Cloudflare Pages, GitHub Pages, or your own web server). For a build service, use `npm run build` and output directory `dist`. `base: './'` in `vite.config.ts` makes the build work at `/` or a subfolder such as `/demo/mainframe/`; keep the trailing slash. No SPA rewrite or server-side code is needed. Serve over HTTPS for the Clipboard API. Do not open the built HTML directly with `file://`.
