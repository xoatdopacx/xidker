---
name: Accounts, admin sign-in and support chat
description: Non-obvious facts and the end-to-end test recipe for customer accounts, the ADMIN_EMAIL sign-in, orders and the buyers-only chat; read before changing or testing any of them.
---

Since 2026-10-22 the admin is the customer account registered with ADMIN_EMAIL: same sign-in form, plus an emailed code on every sign-in, then `/quan-tri`. ADMIN_TOKEN is no longer read (the user may delete the secret); the old token tables stay unused.
**Why:** the user asked for one shared login instead of a token page at /admin.
**How to apply:** on a fresh database (the published site included) the admin must register with ADMIN_EMAIL before the dashboard exists, then enter the bank account, or every order answers 503.

The chat was an open visitor chat until 2026-10-14, when the user asked for a buyers-only support chat. It now opens for signed-in accounts that have placed an order here (or have a paid Whop order from before).
**Why:** the user's request; do not bring back anonymous visitor chat.

Gmail is called only through the `@replit/connectors-sdk` proxy (`proxy("google-mail", ...)`); no googleapis client, no hand-fetched OAuth tokens. The proxy answers 404 "No google-mail connection found" when nothing is connected.
**Why:** the old pattern (fetch `/api/v2/connection?include_secrets=true` with `depl ${WEB_REPL_RENEWAL}`) fails once published: the SDK source says raw WEB_REPL_RENEWAL credentials are no longer accepted and it mints an identity instead.
**How to apply:** never put a code in an email subject; do not add the dashboard path to robots.txt (it would advertise the URL), the page sets noindex itself.

End-to-end test recipe (no real email, no real admin), worked 2026-10-22/23:
- Start a second API from the built dist on a spare port with `MAIL_TEST_OUTBOX=<file>` (emails become JSON lines there) and a throwaway `ADMIN_EMAIL` such as `e2e.admin.<hex>@gmail.com`. Test buyers need an allowed provider (gmail.com), not example.org.
- Register and verify the test admin straight over the API, reading the code from the outbox.
- Drive headless chromium on `localhost:80` with CDP `Fetch` on `*/api/*`; forward each request from Node to the test port with the Origin header dropped, keeping the cookies in Node (one jar per browser context, Set-Cookie stripped from the fulfilled responses). Typing all 6 digits submits a code by itself.
- The run sets the bank account, so first check `site_settings` has no `bank` row in dev. Afterwards delete the test orders and accounts, that `bank` row, and the `support_auth_events` rows added after the run started (otherwise the attempt counters keep blocking).
**Why:** covers sign-up, the email rules, ordering, QR, admin confirmation, the paid email and the download without mailing anyone or touching the user's account.

The admin screens are Vietnamese only and force `<html lang="vi" dir="ltr">` while mounted; customer-facing text goes into all 33 locales.
**Why:** the only admin reads Vietnamese; buyers may arrive in any of the site languages, including RTL ones.
