# Michelle

A scroll-driven portfolio for a 3D designer. The hero has a faceted low-poly bust and leather balls that fall with physics; scrolling flies through a white gallery corridor to a selected-work list with a floating preview card, and ends on a contact screen where the balls come back. Plain HTML, CSS, and JavaScript in one file, with no build step.

## Run locally

Unzip the folder and open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. JavaScript and internet access are needed: Google Fonts (Anton, Antonio) and Three.js load from their original remote URLs. Without WebGL 2, or with reduced motion turned on, the scenes crossfade instead of flying and all content stays readable.

For the most reliable local preview, run a static server from this folder:

```sh
python3 -m http.server 8000
```

On Windows, `py -m http.server 8000` also works. Open **http://localhost:8000/**. Stop the server with Ctrl+C. Python is only needed for this optional server; there is no npm install or build step.

## Edit

Everything except the pictures is in **`index.html`**:

- **Text and links:** find the `COPY:` comments in the HTML: `COPY: HERO` (name, manifesto, bottom headline), `COPY: SELECTED WORK` (the project rows), and `COPY: CONTACT` (headline, email, footer links). The 3D headlines and the work sheet in the corridor are drawn from this same text, so you edit it only once. Replace `hello@example.com` in both places (the `mailto:` link and the visible text) and each `href="#"`. The browser-tab title is in `<title>` in `<head>`.
- **Projects:** each row is an `<a class="row">` with `href`, `data-image` (the preview picture), and `data-alt` (its description for screen readers). Add or remove whole `<li>` blocks. The layout is tuned for three rows; check small screens if you add more.
- **Footer balls:** each footer link has `data-ball-color` (the ball colour) and `data-ball-glyph` (one or two characters printed on the ball). A new link becomes a new ball automatically.
- **Pictures:** `assets/` holds the three project pictures (`.webp`, 16:10, for example 1024×640). Keep the 16:10 ratio for replacements.
- **Colours and fonts:** find `THEME` in the inline `<style>`; the font link is in `<head>`. The corridor room colours are `ROOM_COLORS` under `SETTINGS` in the script.
- **Timing and motion:** find `SETTINGS` at the start of the script. `T` holds the scroll range of each scene (0 = top, 1 = end), `FOV` the camera angle, and `SHEET` the size of the work sheet on the end wall.
- **The bust:** change its main colours (skin, hair, tee, overshirt, eyes) with `BUST_COLORS` under `SETTINGS`. The model itself is packed into the `bust-data` script just above the main script, so there is no separate model file; `buildBust()` in the `3D` section unpacks it and adds the head turn, blinking and breathing.

## Publish

Upload `index.html` and the `assets/` folder to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or your web server. No build command, backend, cookies, or local storage are needed. For a subfolder such as `/demo/michelle/`, keep `index.html` and `assets/` together in that folder; picture paths are relative. In a sandboxed iframe, allow scripts; same-origin access is not required. Footer links open in a new tab, so a sandboxed iframe also needs `allow-popups`.

The bust is based on the MakeHuman base mesh, released under CC0 (public domain). The fonts and library load from external services and are not bundled. The three project pictures are placeholders; replace them with your own work, and check the rights to any media you publish or redistribute.
