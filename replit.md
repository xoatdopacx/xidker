# xidker — web bán source code portfolio

Bilingual (Vietnamese / English) sales page, styled and animated like a pixel-art game road map, that sells portfolio website source code (not landing-page services); buyers pay through Whop hosted checkout and get the source through Whop. Contact email: hello@idkworkshop.com.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/web-landing run dev` — run the landing page (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `WHOP_COMPANY_ID` (biz_…), `WHOP_PRODUCT_ID` (prod_…). The Whop API key comes from the Whop integration at runtime and is never stored in code.
- Whop catalog admin from the shell: `node whop-api.mjs <METHOD> <path> '<json>'` (REST) and `node whop-mcp.mjs` (MCP tools), both in the project root.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5; payments: `@whop/sdk` pinned to 0.0.42
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite, Tailwind; all pixel art is inline SVG (no WebGL, no bitmap images)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- API contract: `lib/api-spec/openapi.yaml` (packages, checkout, checkout status)
- Whop access (server-only): `artifacts/api-server/src/lib/whopClient.ts`, `artifacts/api-server/src/lib/whopStore.ts`
- DB schema: `lib/db/src/schema/checkoutSessions.ts` (ref → Whop checkout configuration)
- Pages: `artifacts/web-landing/src/pages/home.tsx` (sales page), `thank-you.tsx` (`/cam-on`), theme in `src/index.css`

## Architecture decisions

- Whop is the catalog: each package is a visible Whop plan under `WHOP_PRODUCT_ID`. Edit name/price/description in Whop; the site picks it up within 60s (in-memory cache). Plan title + description = Vietnamese text (description: first line = tagline, `- ` lines = features). Plan metadata: `recommended: "true"` = highlighted package; `name_en`, `tagline_en`, `features_en` (one feature per line) = English text, falling back to Vietnamese when missing. When updating plan metadata, send every key (whether Whop merges or replaces it is unverified).
- Language: `GET /api/packages?lang=vi|en` localizes package text server-side. The UI language is chosen client-side (saved choice, else browser language). The checkout-status endpoint is not localized; the thank-you page maps `packageId` to the localized name from the package list.
- Checkout: server creates a Whop checkout configuration with `redirect_url = <site>/cam-on?ref=<random>` and stores ref → checkout id. The redirect itself proves nothing.
- `/cam-on` shows "paid" only when Whop reports a payment with status `paid` for that checkout configuration (server-side lookup); otherwise it polls as "pending".
- The redirect origin is taken from the request's Origin/Referer only if the host is in `REPLIT_DOMAINS`/`REPLIT_DEV_DOMAIN`, so a forged header cannot redirect buyers elsewhere.

## Product

- Sales page in Vietnamese and English (language switch in the nav): pixel-art road-map world where scrolling walks a character from START to a trophy, packages from Whop, FAQ, contact email.
- "Chọn gói này" opens Whop hosted checkout (new tab when embedded in an iframe, same tab otherwise).
- `/cam-on`: post-payment confirmation with verified receipt (package, amount, date, ref).

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
- In-page `#` links are intercepted by the full-screen scene transition, which scrolls instantly with a 64px header offset. Keep section anchors on `id`s and give the transition a destination label for any new jump target.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `whop` skill for Whop integration rules
