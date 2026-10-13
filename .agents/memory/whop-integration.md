---
name: Whop integration quirks
description: Non-obvious Whop SDK/API behavior hit while wiring hosted checkout (SDK version, id param names, VND, helper script failures).
---

- `@whop/sdk` must stay on 0.0.42 unless the server code is rewritten: 2.x exposes a different client (`WhopClient({ token })`) and the skill's whopClient.ts template targets `new Whop({ apiKey })`.
  **Why:** installing latest broke the template; pinning was the smallest working fix.
  **How to apply:** before any upgrade, re-check method signatures in node_modules/@whop/sdk/resources/*.d.ts.
- In SDK 0.0.42 the company id goes in `account_id` for plans and checkout configurations, but in `company_id` for `payments.list`. The REST v1 endpoints accept `company_id` on create.
- Whop accepts `currency: "vnd"` for plans; prices are major units (5990000 = 5.990.000 ₫).
- `node whop-mcp.mjs --schema create_product` crashed repeatedly (empty SSE response → `lines.at(-1)` undefined). REST via `whop-api.mjs POST /api/v1/products` worked; prefer REST for catalog changes.
- Plan `metadata` and multi-line `description` round-trip intact, so they are safe for storing tagline/features/recommended flags.
