# Reelmark

A one-screen, responsive video-marketplace hero. Plain HTML, inline CSS and vanilla JavaScript in one file; no framework, packages or build step.

## Open it

Use a current Chrome, Edge, Firefox or Safari with JavaScript enabled. Internet access is needed for the Google Fonts and the supplied CloudFront poster/video.

- Double-click `index.html`, or
- Open a terminal in this folder and run `python3 -m http.server 8080` (Python 3 required). Visit `http://localhost:8080`.

## Change it

Everything is in **`index.html`**:

- **Text:** find `<!-- COPY:` in the body. Edit the navigation, badge, headline, subline and notes there. Update the `<title>` and description in the head too.
- **Colours, fonts and spacing:** edit the `<style>` block, starting with `:root`. The Google Fonts link is just above it. Desktop positions use `--u`; phone rules are in `@media (max-width: 820px)`.
- **Images and videos:** find `const MEDIA` in the script. Replace `poster` and `video` with your URLs or relative file paths. Both must be matching 16:9 sheets of **five columns × two rows**, not individual portrait files. Tiles are read left to right, top row first. Edit `TILES` for their descriptions.
- **Links:** fill in the empty URLs in `const LINKS`. Navigation, account and CTA links are intentionally disabled until you supply real destinations; this template does not include an account service or additional pages.
- **Motion:** find `/* CAROUSEL:` for speed and geometry. `playEntrance()` controls the one-time entrance. Drag or swipe the cards; when focused, use arrow keys to browse and Space to pause. Reduced motion uses still posters without automatic motion.

If you use local media, keep it in this folder and use paths such as `./poster.webp`. No cookies or browser storage are used.

## Publish

Upload this folder to any static host, such as Netlify, Cloudflare Pages, GitHub Pages or your web server. Choose **no build command** and use this folder as the publish directory. It also works below a path such as `/demo/reelmark/`. Keep `index.html` at that path's root and confirm that any replacement media permits hotlinking/CORS.

The remote media and Google Fonts are not bundled. Before selling or publishing, confirm your right to use and redistribute any media you choose.
