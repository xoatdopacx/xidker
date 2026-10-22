---
name: Whop integration quirks (legacy)
description: Whop SDK/API behavior from when the site sold through Whop checkout; the site stopped using Whop on 2026-10-22, so this only matters for the root whop-*.mjs scripts or a return to Whop.
---

Legacy: the store moved to VietQR bank transfers on 2026-10-22 and the code no longer uses Whop or `@whop/sdk`. The Whop product and plans still exist on Whop's side.

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
- Changing a package's English text (now done from the admin screen, which writes it to the USD plan and drops the per-language metadata copies) makes the other 31 languages show English until the `source` in the built-in translations file is refreshed to match exactly (the API logs a warning). The admin editor warns before saving such a change.
- The plans have `collect_tax: true` and `tax_type: "exclusive"` (tax added on top at checkout). The pricing note promises VAT is adjusted per country, so keep these on for any new plan.
- Plan limits found by trial (2026-10-14): title at most 30 characters, description at most 1000, each metadata value at most 500. 10,000 VND is accepted as a price. PATCH replaces `metadata` whole. New plans default to collect_tax on, tax exclusive and adaptive pricing.
  **Why:** the admin package editor's input limits are set from these; a longer name is rejected by Whop with a 4xx.
  **How to apply:** keep the API spec limits (name 30, tagline 160, 8 features of 100) inside these if they ever change.
- The Whop pixel (`https://t.whop.tw/s.js`) adds `_swuid=<visitor token>` only to whop.com links clicked as real `<a>` elements (capture-phase click listener), so `location.assign()` to checkout loses attribution. It also wraps `history.pushState/replaceState` and counts every change of the full URL (hash included) as a new page view.
  **Why:** read from the script source when installing it; confirmed in headless chromium.
  **How to apply:** leave for Whop through a link click; avoid needless URL rewrites on the visitor site.
- Dev and the live site use the same Whop plans, so a save from the dev admin screen changes the live store. The 3 VND plans are hidden in Whop on purpose: never unhide them. Saving a package that is on sale keeps each plan's own visibility; only the on-sale switch shows or hides both currencies.
  **Why:** an admin save used to show the hidden VND plan again (fixed 2026-10-15).
  **How to apply:** any change to package saving or plan visibility; test with plans you create and delete yourself.
