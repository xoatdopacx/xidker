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
- Whop also accepts `currency: "usd"` plans under the same product, and PATCHing a plan's `metadata` over REST works (send the full object).
  **Why:** the site sells each package in VND and USD as twin plans sharing a `key`; this is how they were created.
  **How to apply:** when adding a currency, create twin plans with the same `key` and set `title_lang` to the language the plan title is written in.
- Changing a package's English text means updating three things so they match exactly: the USD plan title/description, the VND plan's `name_en`/`tagline_en`/`features_en` metadata (these win over the USD text), and the `source` in the built-in translations file. Any mismatch makes the site fall back to English for the other 31 languages (the API logs a warning).
- The plans have `collect_tax: true` and `tax_type: "exclusive"` (tax added on top at checkout). The pricing note promises VAT is adjusted per country, so keep these on for any new plan.
