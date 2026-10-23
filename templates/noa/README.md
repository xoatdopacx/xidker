# Noa

A warm, paper-toned portfolio for a film photographer (the fictional Noa Lindqvist). The photographs open uncropped in a full-screen viewer with keyboard and swipe navigation; in the darkroom section the visitor slides (or simply waits) to develop a print from blank paper; three field notes open as full articles; the print section previews a chosen photograph and size and prepares an enquiry email; the contact address can be copied. Plain HTML, CSS, and JavaScript in one file, with no build step.

## Run locally

Unzip the folder and open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. Internet access is needed for the Google Fonts (Instrument Serif, DM Sans, DM Mono); without it the page falls back to system fonts. With reduced motion turned on, the reveals are switched off and the develop button shows the finished print at once instead of developing it slowly; all content stays readable. Without JavaScript the photographs and stories still show, with a short note about the darkroom and viewer.

For the most reliable local preview, run a static server from this folder:

```sh
python3 -m http.server 8000
```

On Windows, `py -m http.server 8000` also works. Open **http://localhost:8000/**. Stop the server with Ctrl+C. Python is only needed for this optional server; there is no npm install or build step.

## Edit

Everything except the photographs is in **`index.html`**:

- **Text and links:** the content is plain HTML in `<body>`, starting at `CONTENT & LINKS` (name, menu, opening words). The field-note articles are under `CONTENT / FIELD NOTES` and the photo viewer under `CONTENT / VIEWER`. The browser-tab title and description are in `<head>`.
- **Contact:** replace `hello@example.com` in the footer under `08 / CONTACT & LINKS` and in `contactEmail` under `SETTINGS` in the script. Nothing is submitted: the enquiry button opens the visitor's email app with a prepared message, and offers the same text to copy by hand where that is blocked.
- **Prints:** the photograph and size choices (with prices) are the `<option>` lists of `print-choice` and `print-size` in the prints section. The wording of the enquiry email is in `SETTINGS.messages`.
- **Photographs:** `assets/coast.webp` (opening picture, also developed in the darkroom), `tide.webp`, `town.webp`, `valley.webp`, and `winter.webp` (selected work), `darkroom.webp` (the developing tray), `noa.webp` (portrait), and `notes.webp` (field notes). All are square (about 1000×1000); the viewer shows them uncropped. Update the `alt` text of each `<img>` when you change them.
- **Colours and fonts:** find `THEME` at the top of the `<style>`; the font link is in `<head>`.
- **Timing and messages:** `SETTINGS` at the start of the script holds `developmentDuration` (how long a print takes to develop on its own), `revealDuration`, `toastDuration`, and every short message in `messages`.
- **Layout:** the `@media` rules near the end of the `<style>` hold the tablet (1100 px and below) and phone (767 px and below) layouts.

## Publish

Upload `index.html` and the `assets/` folder to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or your web server. No build command, backend, cookies, or local storage are needed. For a subfolder such as `/demo/noa/`, keep `index.html` and `assets/` together in that folder; photo paths are relative. In a sandboxed iframe, allow scripts; same-origin access is not required, and nothing is sent through a form.

The fonts load from Google Fonts and are not bundled. The name, places, prices, and notes are placeholders, and the photographs were made for this demo; replace them with your own work, and check the rights to any media you publish or redistribute.
