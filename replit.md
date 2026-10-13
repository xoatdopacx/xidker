# xidker — landing page bán gói thiết kế landing page

Bilingual (Vietnamese / English) sales landing page with artsy 3D visuals that sells landing-page build packages; buyers pay through Whop hosted checkout. Contact email: hello@idkworkshop.com.

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
- Frontend: React + Vite, Tailwind, three.js via @react-three/fiber + drei (lazy-loaded hero scene)
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

- Sales page in Vietnamese and English (language switch in the nav): artsy 3D hero (WebGL with CSS fallback), 3D sections, pricing from Whop, FAQ, contact email.
- "Chọn gói này" opens Whop hosted checkout (new tab when embedded in an iframe, same tab otherwise).
- `/cam-on`: post-payment confirmation with verified receipt (package, amount, date, ref).

## User preferences

- Talks in Vietnamese; reply in plain Vietnamese without technical jargon.
- Use SVG icons, no emoji anywhere in the UI. Use 3D animation, in an artsy style ("kiểu artis").
- Brand is "xidker" (lowercase). The only real contact detail is hello@idkworkshop.com; do not add phone numbers or addresses unless the user provides them.
- Packages and prices are sample content until the user provides real ones.

## Gotchas

- Do not upgrade `@whop/sdk` casually: v2.x has a different client API (`WhopClient({ token })`). In 0.0.42, plan/checkout params use `account_id`, while `payments.list` uses `company_id`.
- `lib/api-client-react/tsconfig.json` needs `"dom.iterable"` in `lib` or the generated client fails typecheck (`Headers.entries`).
- Reveal animations translate content 40px down; the IntersectionObserver root is extended by 40px to compensate, otherwise items at the fold (hero CTA) stay hidden until scroll.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `whop` skill for Whop integration rules
