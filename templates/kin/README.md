# Kin OS

A scroll-driven landing page for a private, on-device AI operating system. A glowing point-cloud bust looks at the visitor and parts like liquid under the cursor. Scrolling shrinks the stage into a desktop window with floating widgets, dives into the point lattice for the Memory and Agents sections, and ends on a waitlist band. Plain HTML, CSS, and JavaScript in one file, with no build step. This is a frontend template: the waitlist sends nothing until you connect it.

## Run locally

Unzip the folder and open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. JavaScript and internet access are needed: Google Fonts (Inter, Silkscreen, JetBrains Mono) and Three.js load from their original remote URLs. Without WebGL 2, a still glow replaces the bust; with reduced motion turned on, the scenes switch without the scatter, shimmer, and typing effects. All content stays readable in both cases.

For the most reliable local preview, run a static server from this folder:

```sh
python3 -m http.server 8000
```

On Windows, `py -m http.server 8000` also works. Open **http://localhost:8000/**. Stop the server with Ctrl+C. Python is only needed for this optional server; there is no npm install or build step.

## Edit

Everything except the photos is in **`index.html`**:

- **Text and links:** find `COPY & LINKS` at the start of `<body>`. The dock, the four scenes, the closing band, and the footer are plain HTML there. Replace each `href="#"` (Privacy, Terms, Contact). The dialog texts are `MODES` under `DIALOG` in the script, and the requests typed in the composer are `SUGGESTIONS` under `SETTINGS`. The browser-tab title and description are in `<head>`.
- **Waitlist:** find `WAITLIST` in the script. `joinWaitlist(email)` receives a checked email address; it currently waits half a second and reports success without sending anything. Replace its body with a request to your own service (there is an example in the comment) and return `true` when the address was saved. Returning `false` or throwing shows an error in the dialog.
- **Photos:** `assets/person-1.webp` to `person-4.webp` (square, 220×220) fill the People card, and `assets/place.webp` (16:10, 720×450) fills the Places card. Update the `alt` text of each `<img>` when you change them.
- **Colours and fonts:** find `THEME` in the inline `<style>`; the font link is in `<head>`. Under `SETTINGS` in the script, `COLORS` sets the point colours of the bust, `BLOOM` its glow, and `POINT_SIZE` the size of each point.
- **Timing:** under `SETTINGS`, `T` holds the scroll range of each effect (0 = start of the scroll story, 1 = its end), `NAV` the spot each dock link jumps to, and `STAGES` where one scene hands over to the next.
- **Layout:** `RESPONSIVE` in the `<style>` holds the tablet (1100 px and below) and phone (760 px and below) rules.
- **The bust:** its shape is the base64 block in `<script id="bust-data">` at the end of the page, a compressed depth map of a head-and-shoulders model (about 46 KB) with a hair volume added. It was made from the MakeHuman base mesh, which is public domain (CC0). Keep it unless you have data in the same format; `decodeBust()` in the `BUST` section reads it.

## Publish

Upload `index.html` and the `assets/` folder to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or your web server. No build command, backend, cookies, or local storage are needed. For a subfolder such as `/demo/kin/`, keep `index.html` and `assets/` together in that folder; photo paths are relative. In a sandboxed iframe, allow scripts; same-origin access is not required, and the waitlist does not submit a form, so it also works where forms are blocked. Once `joinWaitlist` calls a real service, that service must accept requests from your page's address (CORS).

The fonts and library load from external services and are not bundled. The portraits, the landscape, and the figures in the widgets (moments kept, time saved, and so on) are placeholders; replace them, and check the rights to any media you publish or redistribute.
