# Rowan

A dark, editorial portfolio for an independent software engineer (the fictional Rowan Hale). Project cards open full case-study dialogs, the career section can be stepped through role by role like releases and switched to a diff view, the essays expand in place, an opt-in ambient radio is played by the browser itself, and the contact section copies the email address. Plain HTML, CSS, and JavaScript in one file, with no build step.

## Run locally

Unzip the folder and open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. Internet access is needed for the Google Fonts (Bricolage Grotesque, DM Sans, IBM Plex Mono); without it the page falls back to system fonts. With reduced motion turned on, the reveals and transitions are switched off and all content stays readable.

For the most reliable local preview, run a static server from this folder:

```sh
python3 -m http.server 8000
```

On Windows, `py -m http.server 8000` also works. Open **http://localhost:8000/**. Stop the server with Ctrl+C. Python is only needed for this optional server; there is no npm install or build step.

## Edit

Everything except the pictures is in **`index.html`**. The comment at the start of `<body>` lists where each part lives.

- **Text and links:** the page sections are the numbered HTML blocks `CONTENT 00` (hero) to `CONTENT 07` (contact); the menu and the footer are under `CONTENT & LINKS`. The career versions are in `CONTENT 03` and the essays in `CONTENT 04`. The browser-tab title and description are in `<head>`.
- **Projects:** each card in `CONTENT 01` opens the dialog with the matching id under `PROJECT DETAIL CONTENT` near the end of `<body>`. Edit both when you change a project.
- **Testimonial:** `CONTENT 06` holds a placeholder quote from a fictional person. Replace it with a real quote or delete the block.
- **Contact:** replace `hello@example.com` in the contact link in `CONTENT 07`; the copy button reads that link. Where copying is blocked (some embedded previews), the address is selected so the visitor can copy it by hand.
- **Pictures:** `assets/signal-instrument.webp` (hero, square 1024×1024), `assets/latchline.webp` and `assets/threadwork.webp` (project cards and dialogs, square 1000×1000). Keep square pictures, or check the crop after changing them, and update the `alt` text of each `<img>`.
- **Colours and fonts:** find `THEME` at the top of the `<style>`; the font link is in `<head>`.
- **Timing and radio:** the CSS timings are under `SETTINGS` inside `:root`. The JavaScript `SETTINGS` at the start of the last script holds the reveal stagger, message duration, clock refresh, and the radio's fade, maximum volume, and chord notes; `UI_COPY` beside it holds the short messages.
- **Layout:** the `RESPONSIVE` blocks in the `<style>` hold the tablet (1100 px and below) and phone (767 px and below) rules.

## Publish

Upload `index.html` and the `assets/` folder to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or your web server. No build command, backend, cookies, or local storage are needed. For a subfolder such as `/demo/rowan/`, keep `index.html` and `assets/` together in that folder; picture paths are relative. In a sandboxed iframe, allow scripts; same-origin access is not required, and nothing is sent through a form.

The fonts load from Google Fonts and are not bundled. The name, clients, projects, quote, and figures are placeholders, and the pictures were made for this demo; replace them with your own, and check the rights to any media you publish or redistribute.
