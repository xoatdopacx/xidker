# Jack — 3D Creator

A standalone, responsive portfolio template built with React, TypeScript, Vite, Tailwind CSS 3, and Framer Motion. It includes the hero, two scroll-linked GIF rows, about section, five services, and three stacking projects. No backend, account, cookies, or local storage is required.

## Run locally

Install **Node.js 20.19+** (Node.js 22 LTS recommended), which includes npm. Internet access is needed to install packages and load the supplied images, animated GIFs, and Google Fonts.

1. Unzip the template and open the `jack` folder in your editor.
2. Open a terminal in that folder and run:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. Do not open `index.html` directly.

## Make it yours

- **Text and navigation:** `src/data/content.ts` → `HERO`, `LABELS`, `ABOUT_TEXT`, `NAV_LINKS`, `SERVICES`, and `PROJECTS`.
- **Contact:** change `CONTACT_EMAIL` at the top of `src/data/content.ts`. `hello@example.com` is a placeholder, not Jack's actual address. “Contact” and both “Contact Me” buttons use it.
- **Live project links:** replace each `href` in `PROJECTS` in `src/data/content.ts`. The brief supplies no destination URLs, so these start as `https://example.com`.
- **Images:** in `src/data/content.ts`, edit `HERO.portrait`, `DECORATIVE_IMAGES[].src`, and each project's `images` array (left top, left bottom, right).
- **Animated media:** `MARQUEE_IMAGES` in `src/data/content.ts` contains all 21 supplied GIF URLs. The first 11 go in row one; the other 10 go in row two. There are no video files or video players in this template.
- **Your own media:** put files in `src/assets/`, import them into `src/data/content.ts` (for example, `import portrait from "../assets/portrait.png"`), and use that import instead of a URL. This keeps sub-folder publishing safe.
- **Font, colors, and gradients:** `src/index.css`; Tailwind colors and font settings: `tailwind.config.cjs`. Section spacing and breakpoints live in `src/sections/`; reusable motion and buttons live in `src/components/`.
- **Browser title and description:** the `<title>` and description `<meta>` in `index.html`.

The supplied media remain hosted at their original URLs. Check availability and your rights to use or redistribute those assets before selling or publishing; source code does not grant rights to third-party media.

Known source issue: the final GIF, `hero-celestia-preview-0yO3jXO8.gif`, returned HTTP 404 during verification. Its specified URL is preserved as the last entry in `MARQUEE_IMAGES`; replace that entry with your own working media if needed.

## Publish

```sh
npm run build
npm run preview
```

Upload the **contents of `dist/`** to any static host, such as Netlify, Cloudflare Pages, or GitHub Pages. For a Git-connected host, use `npm run build` and output directory `dist`. The Vite base is `./`, so the same build works at `/` or `/demo/jack/`; keep the generated asset paths intact. No server-side routes or environment variables are needed.

The production build also renders in a sandboxed iframe with scripts allowed, without same-origin access or special CORS headers. `vite.config.ts` bundles a classic script for this; leave the sandbox-safe build plugin in place. Email links and new tabs additionally depend on the embedding page permitting those actions.
