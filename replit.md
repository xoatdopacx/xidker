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
- Frontend: React + Vite, Tailwind; all pixel art is inline SVG (no WebGL, no bitmap images)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- API contract: `lib/api-spec/openapi.yaml` (packages, checkout, checkout status, customer support chat `/support/*`, admin inbox `/admin/*`)
- Whop access (server-only): `artifacts/api-server/src/lib/whopClient.ts`, `artifacts/api-server/src/lib/whopStore.ts`
- DB schema: `lib/db/src/schema/checkoutSessions.ts` (ref → Whop checkout configuration), `support.ts` (customer chat accounts, sessions, sign-in attempt log), `chat.ts` (conversations, messages), `adminAuth.ts`
- Pages: `artifacts/web-landing/src/pages/home.tsx` (sales page), `thank-you.tsx` (`/cam-on`), `admin.tsx` (`/admin` inbox, screens in `src/components/admin/`), theme in `src/index.css`
- Support chat: `src/components/chat-widget.tsx` (button + panel), `src/lib/support-chat.ts` (show/open from other pages); server in `artifacts/api-server/src/routes/support.ts` and `src/lib/supportAuth.ts`
- UI text: `artifacts/web-landing/src/locales/<code>.json` (`vi.json` is the source, `en.json` the fallback); languages, detection, fonts and currency in `src/lib/i18n.tsx`; picker in `src/components/lang-picker.tsx`
- Package text translations: `artifacts/api-server/src/lib/packageTranslations.ts`

## Architecture decisions

- Whop is the catalog: each package is a visible Whop plan under `WHOP_PRODUCT_ID`. Edit name/price/description in Whop; the site picks it up within 60s (in-memory cache). Plans are grouped into packages by metadata `key` (`personal`, `setup`, `commercial`); each package has one VND plan and one USD plan with the same `key`. Metadata `title_lang` says which language the plan title + description are written in (`vi` on the VND plans, `en` on the USD plans; description: first line = tagline, `- ` lines = features). Other metadata: `recommended: "true"` = highlighted package; `name_<lang>`, `tagline_<lang>`, `features_<lang>` (one feature per line) override the text for one language. When updating plan metadata, send every key.
- Package text per language: own Whop text → built-in translation (only while Whop's English text still equals the translation's `source`; otherwise the server logs a warning and shows English) → English → Vietnamese. After rewording a package in Whop, refresh `packageTranslations.ts` or those languages show English.
- Language: `GET /api/packages?lang=<code>` (33 codes) localizes package text server-side. Home translations use stable `/<code>/` URLs; `/` is the English default (`x-default`). The home URL wins over stored/browser preferences so crawlers and visitors see the same language. Legacy home `?lang=` links are normalized in the browser; other pages retain query/saved/browser language selection. Currency: VND by default for Vietnamese, USD for every other language; the visitor can switch and the choice is saved. The checkout-status endpoint is not localized; the thank-you page maps `packageId` to the localized name from the package list.
- Locale SEO: the Vite plugin generates 33 localized HTML shells with self-canonical, reciprocal hreflang, crawlable language links and social metadata. `seo/site.ts` uses the confirmed production origin; set build-time `SEO_SITE_ORIGIN` when moving domains. `public/share-card.png` is the 1200×630 preview (editable source in `seo/share-card.svg`).
- Server rendering: dev and production both run `seo/server.mjs`, which renders the sales page with live Whop prices in the HTML. It reads the catalog from the API through `localhost:80` in dev and directly on the API's own port (8080) in production. If the catalog is down or slower than 3s, the page still answers 200 without prices and the browser loads them. Never let `/` depend on the API, because the publish health check calls `/`. Check with a landing build (`PORT=18500 BASE_PATH=/` must be set) followed by `node --test artifacts/web-landing/tests/ssr.test.mjs artifacts/web-landing/tests/seo.test.mjs`.
- Checkout: server creates a Whop checkout configuration with `redirect_url = <site>/cam-on?ref=<random>` and stores ref → checkout id. The redirect itself proves nothing.
- `/cam-on` shows "paid" only when Whop reports a payment with status `paid` for that checkout configuration (server-side lookup); otherwise it polls as "pending".
- The redirect origin is taken from the request's Origin/Referer only if the host is in `REPLIT_DOMAINS`/`REPLIT_DEV_DOMAIN`, so a forged header cannot redirect buyers elsewhere.
- Support chat is for buyers only. The chat button appears after a verified paid order on `/cam-on`, from the footer link "Chat hỗ trợ cho khách đã mua", or on a browser that has signed in before. Activation = purchase email + order ID (Whop `pay_…` id, or the `/cam-on` ref) + a new password; the server checks with Whop that the order is paid and that its buyer email matches. Later visits sign in with email + password. A new sign-in ends every other session for that account, so only one browser is signed in at a time. No password reset; customers write to the contact email.
- "Already activated" (409) is answered only after the order and email match, so the endpoint cannot be used to find out which emails are customers. Failed activations and wrong passwords are counted in the database (works across server instances).
- Admin sign-in: `ADMIN_TOKEN`, then a 6-digit code emailed to `ADMIN_EMAIL`. Changing `ADMIN_TOKEN` signs every admin out. Admin replies use their own input schema (`AdminMessageInput`, no language field).
- Chat updates by polling the database (customer panel every 3s while open, admin list 5s, admin thread 3s), because the app runs on autoscale and in-memory state would split across instances.

## Product

- Sales page in 33 languages (pixel globe picker in the header and footer; Arabic, Persian, Hebrew and Urdu read right to left): pixel-art road-map world where scrolling walks a character from START to a trophy, packages from Whop with a VND/USD switch, FAQ, contact email.
- "Chọn gói này" opens Whop hosted checkout (new tab when embedded in an iframe, same tab otherwise).
- `/cam-on`: pixel "loading" cover while the payment is checked, then the verified receipt (package, amount, date, order ID) and a card to switch on support chat with the order ID filled in.
- Support chat panel (bottom-right, all 33 languages) with sign-in / activate tabs; `/admin` inbox in Vietnamese only, showing each customer's email, package and order ID.

## User preferences

- Talks in Vietnamese; reply in plain Vietnamese without technical jargon.
- Use SVG icons, no emoji anywhere in the UI. Motion and look follow the user's pixel-art game "ROAD MAP" reference (attached_assets/__1791889422870.jpg); this replaced the earlier artsy 3D sculpture direction.
- Vietnamese copy must be plain, natural everyday Vietnamese; the user rejected the poetic headline "Trang bán hàng khách dừng lại để ngắm."
- Brand is "xidker" (lowercase). The only real contact detail is hello@idkworkshop.com; do not add phone numbers or addresses unless the user provides them.
- The product is portfolio source code. The three packages (Source Cá Nhân / Source + Cài Đặt / Source Thương Mại) and their prices are sample content until the user provides real ones. Whop grants access per product, not per plan, so different templates would need separate Whop products.
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

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `whop` skill for Whop integration rules
