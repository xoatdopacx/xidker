# xidker — web bán source code portfolio

Multilingual (33 languages) sales page, styled and animated like a pixel-art game road map, that sells portfolio website source code (not landing-page services); buyers pay in VND or USD through Whop hosted checkout and get the source through Whop. Contact email: hello@idkworkshop.com.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/web-landing run dev` — run the landing page (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `WHOP_COMPANY_ID` (biz_…), `WHOP_PRODUCT_ID` (prod_…), `SESSION_SECRET` (keys every stored hash), `ADMIN_TOKEN` (secret, at least 8 characters, or admin sign-in stays off), `ADMIN_EMAIL` (where admin sign-in codes are sent through the Gmail integration). The Whop API key comes from the Whop integration at runtime and is never stored in code.
- Whop catalog admin from the shell: `node whop-api.mjs <METHOD> <path> '<json>'` (REST) and `node whop-mcp.mjs` (MCP tools), both in the project root.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5; payments: `@whop/sdk` pinned to 0.0.42
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite, Tailwind; pixel art is inline SVG (no WebGL). The only bitmaps are the user's own pixel cats (small PNGs in `src/assets/`, drawn with `.pixel`) and the sample pictures the admin uploads
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- API contract: `lib/api-spec/openapi.yaml` (packages, checkout, checkout status, source samples `/samples`, customer support chat `/support/*`, admin inbox, packages, samples and orders `/admin/*`, sample picture upload/serving `/storage/*`)
- Whop access (server-only): `artifacts/api-server/src/lib/whopClient.ts`, `artifacts/api-server/src/lib/whopStore.ts` (site catalog, checkout), `whopAdmin.ts` (admin package editing)
- DB schema: `lib/db/src/schema/checkoutSessions.ts` (ref → Whop checkout configuration), `support.ts` (customer chat accounts, sessions, sign-in attempt log), `chat.ts` (conversations, messages), `adminAuth.ts`, `sourceSamples.ts` (samples buyers pick from)
- Pages: `artifacts/web-landing/src/pages/home.tsx` (sales page), `thank-you.tsx` (`/cam-on`), `admin.tsx` (`/admin`: tabs Tin nhắn, Sản phẩm & giá, Mẫu source, Đơn hàng; screens in `src/components/admin/`), theme in `src/index.css`
- Source samples: picker `src/components/sample-picker.tsx`; admin picture shrinking `src/components/admin/sample-upload.ts`; server `artifacts/api-server/src/routes/samples.ts`, `src/lib/samples.ts`, `src/routes/storage.ts`, `src/routes/adminOrders.ts`
- Support chat: `src/components/chat-widget.tsx` (button + panel), `src/lib/support-chat.ts` (show/open from other pages); server in `artifacts/api-server/src/routes/support.ts` and `src/lib/supportAuth.ts`
- UI text: `artifacts/web-landing/src/locales/<code>.json` (`vi.json` is the source, `en.json` the fallback); languages, detection, fonts and currency in `src/lib/i18n.tsx`; picker in `src/components/lang-picker.tsx`
- Package text translations: `artifacts/api-server/src/lib/packageTranslations.ts`

## Architecture decisions

- Whop is the catalog: each package is a visible Whop plan under `WHOP_PRODUCT_ID`. Edit name/price/description from `/admin` → "Sản phẩm & giá" (or in Whop); the site picks it up within 60s (in-memory cache; admin saves clear it on the server they hit). Plans are grouped into packages by metadata `key` (`personal`, `setup`, `commercial`); each package has one VND plan and one USD plan with the same `key`. Metadata `title_lang` says which language the plan title + description are written in (`vi` on the VND plans, `en` on the USD plans; description: first line = tagline, `- ` lines = features). Other metadata: `recommended: "true"` = highlighted package; `name_<lang>`, `tagline_<lang>`, `features_<lang>` (one feature per line) override the text for one language. When updating plan metadata, send every key (Whop replaces it whole). The admin screen manages one-time plans only: it writes the Vietnamese text to the VND plan and the English text to the USD plan, drops the `name_/tagline_/features_` vi/en metadata copies, creates new packages with a `<slug>-<hex>` key (both plans hidden first, then shown together), allows one recommended package, and deletes only packages without buyers (others can be hidden).
- Package text per language: own Whop text → built-in translation (only while Whop's English text still equals the translation's `source`; otherwise the server logs a warning and shows English) → English → Vietnamese. After rewording a package in Whop, refresh `packageTranslations.ts` or those languages show English.
- Language: `GET /api/packages?lang=<code>` (33 codes) localizes package text server-side. Home translations use stable `/<code>/` URLs; `/` is the English default (`x-default`). The home URL wins over stored/browser preferences so crawlers and visitors see the same language. Legacy home `?lang=` links are normalized in the browser; other pages retain query/saved/browser language selection. Currency: VND by default for Vietnamese, USD for every other language; the visitor can switch and the choice is saved. The checkout-status endpoint is not localized; the thank-you page maps `packageId` to the localized name from the package list.
- Locale SEO: the Vite plugin generates 33 localized HTML shells with self-canonical, reciprocal hreflang, crawlable language links and social metadata. `seo/site.ts` uses the confirmed production origin; set build-time `SEO_SITE_ORIGIN` when moving domains. `public/share-card.png` is the 1200×630 preview (editable source in `seo/share-card.svg`).
- Server rendering: dev and production both run `seo/server.mjs`, which renders the sales page with live Whop prices in the HTML. It reads the catalog from the API through `localhost:80` in dev and directly on the API's own port (8080) in production. If the catalog is down or slower than 3s, the page still answers 200 without prices and the browser loads them. Never let `/` depend on the API, because the publish health check calls `/`. Check with a landing build (`PORT=18500 BASE_PATH=/` must be set) followed by `node --test artifacts/web-landing/tests/ssr.test.mjs artifacts/web-landing/tests/seo.test.mjs`.
- Addresses carry no `#section`: nav links scroll without touching the URL, and an old `/vi#hoi-dap` link lands on the section and then drops the hash.
- Whop pixel (Whop's snippet, scope = `WHOP_COMPANY_ID`) sits in the `<head>` of `index.html`; it is skipped on `/admin`, `localhost` and `*.replit.dev`, so only the published site reports visitors. It adds a visitor id (`_swuid`) to clicked `<a>` links to whop.com, which is why checkout leaves through a real link click.
- Security headers: the page server (`seo/server.mjs`) sends CSP, X-Frame-Options, COOP and CORP on the published site only, because the workspace preview frames the dev server; nosniff, Referrer-Policy and Permissions-Policy apply everywhere. Each page gets a fresh CSP nonce on the shell's own `<script>` tags, and inline event handlers in `index.html` are allowed by hash automatically. Any new outside script, stylesheet, font, image host, API call or iframe must be added to `pagePolicy`, or browsers block it on the live site only. The Whop pixel needs `t.whop.tw` for scripts and posts, plus blob workers. COEP stays off (it would block Google Fonts and the pixel). The `GAESA` cookie and `Server: Google Frontend` come from the hosting and cannot be changed. The API sets its own headers with helmet.
- Checkout: server creates a Whop checkout configuration with `redirect_url = <site>/cam-on?ref=<random>` and stores ref → checkout id. The redirect itself proves nothing.
- `/cam-on` shows "paid" only when Whop reports a payment with status `paid` for that checkout configuration (server-side lookup); otherwise it polls as "pending".
- The redirect origin is taken from the request's Origin/Referer only if the host is in `REPLIT_DOMAINS`/`REPLIT_DEV_DOMAIN`, so a forged header cannot redirect buyers elsewhere.
- Support chat is for buyers only. The chat button appears after a verified paid order on `/cam-on`, from the footer link "Chat hỗ trợ cho khách đã mua", or on a browser that has signed in before. Activation = purchase email + order ID (Whop `pay_…` id, or the `/cam-on` ref) + a new password; the server checks with Whop that the order is paid and that its buyer email matches. Later visits sign in with email + password. A new sign-in ends every other session for that account, so only one browser is signed in at a time. No password reset; customers write to the contact email.
- "Already activated" (409) is answered only after the order and email match, so the endpoint cannot be used to find out which emails are customers. Failed activations and wrong passwords are counted in the database (works across server instances).
- Source samples: a package whose Whop plan has metadata `pick_sample: "true"` (switch in the admin package editor) opens the sample picker before checkout. `GET /api/packages` reports `pickSample: false` while no sample is visible (or the database is down), so the picker only appears when there is something to pick. Checkout for such a package needs a visible `sampleId` (404 if it was hidden or deleted meanwhile, shown inside the picker; 400 if none was picked). The sample id and name go into the Whop checkout metadata (Whop copies it onto the payment) and into `checkout_sessions` (the name is a snapshot, kept after a rename or delete); the `/cam-on` receipt and the admin orders tab show it. Retrying a failed payment sends the same sample; if it is gone, the buyer is asked to pick again. Sample names are shown as written in every language.
- Sample pictures are shrunk in the admin's browser (full picture at most 1600 px wide, plus a 640×800 preview of its top), sent straight to App Storage through a signed upload link (so the `/admin` CSP allows `https://storage.googleapis.com` in `connect-src`, and only there), and served same-origin from `/api/storage/objects/...` only once they belong to a saved sample (cached as immutable). Deleting a sample or removing a picture deletes the files.
- Admin sign-in: `ADMIN_TOKEN`, then a 6-digit code emailed to `ADMIN_EMAIL`. Changing `ADMIN_TOKEN` signs every admin out. Admin replies use their own input schema (`AdminMessageInput`, no language field).
- Chat updates by polling the database (customer panel every 3s while open, admin list 5s, admin thread 3s), because the app runs on autoscale and in-memory state would split across instances.
- Chat translation (`artifacts/api-server/src/lib/chatTranslate.ts`, Replit AI Integrations → OpenAI; no API key, usage is billed to Replit credits): customer messages get a Vietnamese translation when the admin's inbox asks for it (on opening a thread, never during the customer's send). Admin replies are translated before saving into the language of the customer's newest message with a known language, else the conversation's site language. If translating fails, the reply is saved as written, the customer reads the Vietnamese and the admin sees "Dịch lại". The conversation list keeps the original text.

## Product

- Sales page in 33 languages (pixel globe picker in the header and footer; Arabic, Persian, Hebrew and Urdu read right to left): pixel-art road-map world where scrolling walks a character from START to a trophy, packages from Whop with a VND/USD switch, FAQ, contact email.
- "Chọn gói này" opens Whop hosted checkout (new tab when embedded in an iframe, same tab otherwise). For a package with a sample choice it first opens the sample picker (browse samples, open full screenshots, pick one, then pay). The pricing grid adapts to 1–5+ packages.
- `/cam-on`: pixel "loading" cover while the payment is checked, then the verified receipt (package, picked sample, amount, date, order ID) and a card to switch on support chat with the order ID filled in. A failed payment shows the user's pixel cat holding an empty wallet.
- Support chat panel (bottom-right, all 33 languages) with sign-in / activate tabs; replies reach the customer in their language, marked "Translated automatically". `/admin` in Vietnamese only: inbox showing each customer's email, package and order ID, a Vietnamese line under every customer message and the translation each reply was sent with, and "Sản phẩm & giá" to change prices and text, hide/show, mark the recommended package, list a new source for sale, or delete an unsold one; "Mẫu source" to upload, reorder, hide/show and delete samples; "Đơn hàng" for recent paid orders with the sample each buyer picked. Files are still delivered by hand.

## User preferences

- Talks in Vietnamese; reply in plain Vietnamese without technical jargon.
- Use SVG icons, no emoji anywhere in the UI. Motion and look follow the user's pixel-art game "ROAD MAP" reference (attached_assets/__1791889422870.jpg); this replaced the earlier artsy 3D sculpture direction.
- Vietnamese copy must be plain, natural everyday Vietnamese; the user rejected the poetic headline "Trang bán hàng khách dừng lại để ngắm."
- Brand is "xidker" (lowercase). The only real contact detail is hello@idkworkshop.com; do not add phone numbers or addresses unless the user provides them.
- The product is portfolio source code. Packages are managed by the user from `/admin` (see the pricing-rules memory for the agreed contents of the current three). Whop grants access per product, not per plan, so different templates would need separate Whop products.
- No invented social proof (customer names, testimonials, counts, statistics).

## Gotchas

- Do not upgrade `@whop/sdk` casually: v2.x has a different client API (`WhopClient({ token })`). In 0.0.42, plan/checkout params use `account_id`, while `payments.list` uses `company_id`.
- `lib/api-client-react/tsconfig.json` needs `"dom.iterable"` in `lib` or the generated client fails typecheck (`Headers.entries`).
- The road on the home page is measured from the `[data-road]` anchors in the page layout. Any interaction that changes page height (e.g. an expanding FAQ) reshapes and stretches the road, so interactive parts must keep a fixed height. Switching language is the only expected exception.
- Pixelify Sans draws 2 like Z/8 and 5 like S. Digits use `.font-num` (Silkscreen); Pixelify Sans is for letters only, and it is not used for Vietnamese text.
- Card "pixel build" reveals keep their state in DOM data attributes (`data-rv`, `data-built`) and use one shared scroll check, not IntersectionObserver, so cards skipped by a fast jump finish instantly instead of staying hidden. A remounted card builds again, so lists must not remount on re-render (the package list keeps previous data while the other language loads).
- Each package card stacks its price in every currency in the same spot (only the active one visible), and the price size follows the card width with a cap, so the VND/USD switch never changes card height and long VND prices fit tablet cards.
- `.tile` (unlayered CSS) sets `position: relative`, which beats Tailwind's `fixed`; a `.tile` element that must be fixed needs `fixed!` (the language panel opened off-screen until this was fixed).
- New UI text goes into `vi.json` and `en.json` first; other locales fall back to English key by key until translated. Prices always use Latin digits (`numLocale`), because the number font only has those.
- Right-to-left languages flip text and arrows only; the road, the walking character and the `[data-road]` geometry are never mirrored.
- In-page `#` links are intercepted by the full-screen scene transition, which scrolls instantly with a 64px header offset. Keep section anchors on `id`s and give the transition a destination label for any new jump target.
- A language switch blocks the page for several hundred ms (re-render, text layout, font swap; worst for Chinese/Japanese/Korean). The loading card's bar, walker and percentage are queued up front as browser (compositor) animations so they keep moving through that; do not drive them with JS timers. The new language's font stylesheet is added only after the screen is covered, because adding a stylesheet restyles the whole page and would stall the cover animation.
- Transition and card-build canvases are reused from a pool; creating canvases costs more than drawing into them.
- Inside Radix dialogs (the sample picker), show errors inline, not as toasts: toasts sit under the dialog backdrop.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `whop` skill for Whop integration rules
