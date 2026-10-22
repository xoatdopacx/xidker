# Iris

A single-screen, dark AI-assistant hero with a pointer-following Three.js robot, floating arms, blinking eyes, and a mobile menu. This is a frontend template, not an AI chat service.

## Run locally

Unzip the folder and open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. JavaScript, WebGL 2, and internet access are needed: Google Fonts, Three.js, and the two robot models load from their original remote URLs. A procedural robot is used if a model fails to load. Three.js itself must be reachable.

For the most reliable local preview, run a static server from this folder:

```sh
python3 -m http.server 8000
```

On Windows, `py -m http.server 8000` also works. Open **http://localhost:8000/**. Stop the server with Ctrl+C. Python is only needed for this optional server; there is no npm install or build step.

## Edit

Everything is in **`index.html`**:

- **Text and links:** find `COPY & LINKS` in the HTML. Edit the navigation, heading, subline, and buttons there. Change each `href="#"` to your destination; update both desktop and mobile navigation. The browser-tab title is in `<title>` in `<head>`.
- **Colours, spacing, fonts:** find `THEME`, `NAVIGATION`, `HERO`, and `RESPONSIVE` in the inline `<style>`. The Figtree font link is in `<head>`.
- **Robot models:** find `MODEL URLS` at the start of the inline module and change `HEAD_GLB` / `ARM_GLB`. Replacement models need compatible dimensions and orientation, and remote hosts must permit CORS. The procedural fallback and model preparation are in the same module.
- **Images and videos:** this template has no image or video files, image tags, or video URLs to replace. The orb is CSS; the eyes and glow textures are drawn by `radialTexture()` in the module. The robot uses the two GLB URLs above.
- **Placement and motion:** find `LAYOUT` and `POINTER, IDLE LOOK, AND ANIMATION` in the module.

## Publish

Upload `index.html` to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or your web server. No build command, backend, cookies, or local storage are needed. For a subfolder such as `/demo/iris/`, upload it as that folder's `index.html`; keep any new local asset paths relative (for example `./images/example.webp`). In a sandboxed iframe, allow scripts; same-origin access is not required.

The external fonts, library, and models are not bundled. Check their availability and the rights to any media you publish or redistribute.
