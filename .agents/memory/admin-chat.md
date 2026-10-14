---
name: Support chat and admin sign-in
description: Non-obvious facts and test recipes for the buyers-only support chat and the /admin inbox sign-in (token + emailed code); read before changing or testing either.
---

The chat was an open visitor chat until 2026-10-14, when the user asked for a buyers-only support chat (purchase email + order ID + password to activate, one browser signed in at a time). The rules themselves are in `replit.md`.
**Why:** the user's request; do not bring back anonymous visitor chat.

Unverified: whether Whop returns the buyer email for real paid orders (the API key may need permission to read member emails). Activation answers 503 and logs "Whop returned no buyer email" when it is missing. Nobody has activated with a real purchase yet.
**How to apply:** after the first real order, check the API log for that line before blaming the chat code.

Admin sign-in is two steps: ADMIN_TOKEN (trimmed, NFC, at least 8 characters, or sign-in is off with a log line), then a 6-digit code emailed through the Gmail connector to ADMIN_EMAIL. The code challenge is bound to the browser by a `__Host-` cookie; codes and tokens are stored only as hashes. A session is tied to the ADMIN_TOKEN in force when it was created.
**Why:** the user asked for "token + 6-digit code via Gmail" plus security hardening.
**How to apply:** never put the code in the email subject; do not add /admin to robots.txt (it would advertise the URL) — the page sets noindex itself.
The minimum key length was lowered from 24 to 8 on 2026-10-14.
**Why:** the user wants a short, memorable key and turned down longer ones. The emailed code and the attempt limits keep the sign-in safe.
**How to apply:** do not push for a longer key again. Never write the key into code, notes or commands; the user once typed it in the chat. To change it, the user edits it themselves: Tools → Secrets → ⋮ next to ADMIN_TOKEN → Edit → Update Secret. The secret form came back "added or confirmed" twice without the server accepting the key. Check by restarting the API and posting a wrong key: 401 means sign-in is on, 503 means it is off. Then delete the bad_token row that post adds to admin_login_events.

Gmail is called only through the `@replit/connectors-sdk` proxy (`proxy("google-mail", ...)`); no googleapis client, no hand-fetched OAuth tokens. The proxy answers 404 "No google-mail connection found" when nothing is connected.
**Why:** the old pattern (fetch `/api/v2/connection?include_secrets=true` with `depl ${WEB_REPL_RENEWAL}`) fails once published: the SDK source says raw WEB_REPL_RENEWAL credentials are no longer accepted and it mints an identity instead.

Test recipes:
- Real admin code delivery without the user's ADMIN_TOKEN: run a second API process on another port with a throwaway ADMIN_TOKEN, request a code, read it back through the Gmail proxy (gmail.readonly is granted; the connected account is the admin address, so codes land in INBOX), verify, sign out, then delete the new admin_login_* / admin_sessions rows. Each run sends one real email to the admin, so tell the user.
- Customer chat without a real purchase: insert a support_accounts row whose password_hash comes from the server's own hashPassword, then sign in from the site. Activation can only be tested up to the "no paid order matches" answer. Afterwards delete the row (sessions and conversations cascade) and its support_auth_events rows (match by email_hash), or the failed-attempt counters keep blocking.

The admin screens are Vietnamese only and force `<html lang="vi" dir="ltr">` while mounted; customer-facing chat text goes into all 33 locales.
**Why:** the only admin reads Vietnamese; buyers may arrive in any of the site languages, including RTL ones.
