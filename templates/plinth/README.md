# Plinth

A calm, paper-toned portfolio for a small architecture and interiors studio (the fictional Plinth). Projects can be filtered and open as full folios; in the drawing section the visitor drags between a floor plan and the finished room; the materials list opens one material at a time with its picture; the journal entries open as readable articles; the contact section copies the email address. Plain HTML, CSS, and JavaScript in one file, with no build step.

## Run locally

Unzip the folder and open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. Internet access is needed for the Google Fonts (Manrope, Instrument Serif, DM Mono); without it the page falls back to system fonts. With reduced motion turned on, the reveals and transitions are switched off and all content stays readable. The plan slider also works with touch and the arrow keys.

For the most reliable local preview, run a static server from this folder:

```sh
python3 -m http.server 8000
```

On Windows, `py -m http.server 8000` also works. Open **http://localhost:8000/**. Stop the server with Ctrl+C. Python is only needed for this optional server; there is no npm install or build step.

## Edit

Everything except the pictures is in **`index.html`**:

- **Text and links:** the menu is under `CONTENT & LINKS / NAVIGATION`; the sections are the blocks `CONTENT / 00 — OPENING` to `CONTENT & LINKS / 07 — CONTACT`. The browser-tab title and description are in `<head>`.
- **Projects:** each card in `CONTENT / 02 — SELECTED PROJECTS` has a `data-project` name and a `data-category` used by the filter buttons above the cards (update the counts on the buttons too). The folio that opens is the `<template id="project-…">` with the same name under `CONTENT / PROJECT FOLIOS`; to add a project, add a card and a matching template.
- **Journal:** the full articles are under `CONTENT / JOURNAL ENTRIES`.
- **Drawing:** the floor plan is an inline SVG in `CONTENT / 03 — FROM LINE TO LIFE`. It is a concept drawing, not a construction document; replace it with your own plan.
- **Contact:** replace the email in the contact link and in the manual-copy field in `CONTENT & LINKS / 07 — CONTACT`; the copy button reads that link. Where copying is blocked (some embedded previews), the address is shown ready to copy by hand.
- **Pictures:** `assets/courtyard.webp` (opening picture, the drawing section, and the Marden Courtyard project), `alder-house.webp`, `fold-house.webp`, and `still-room.webp` (projects), `window-detail.webp` and `material-study.webp` (materials and journal), and `studio.webp` (the two partners). Several pictures are reused in the materials list, the field notes, and the folios, so search for a file name to find every place it appears. They are square, about 1000×1000 (`alder-house.webp` is 860×860). Update the `alt` text of each `<img>` when you change them.
- **Colours and fonts:** find `PLINTH / THEME` at the top of the `<style>`; the font link is in `<head>`.
- **Timing:** `SETTINGS / BEHAVIOUR & ANIMATION TIMINGS` at the start of the script holds the reveal duration and trigger point, how long the copy confirmation stays, and the width where the phone menu takes over.
- **Layout:** the `@media` rules in the `<style>` hold the tablet (1100 px and below) and phone (767 px and below) layouts.

## Publish

Upload `index.html` and the `assets/` folder to any static host, such as GitHub Pages, Netlify, Cloudflare Pages, or your web server. No build command, backend, cookies, or local storage are needed. For a subfolder such as `/demo/plinth/`, keep `index.html` and `assets/` together in that folder; picture paths are relative. In a sandboxed iframe, allow scripts; same-origin access is not required, and nothing is sent through a form.

The fonts load from Google Fonts and are not bundled. The studio, partners, projects, places, and articles are placeholders, and the pictures were made for this demo; replace them with your own work, and check the rights to any media you publish or redistribute.
