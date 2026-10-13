---
name: Live chat and admin sign-in
description: Design decisions behind the visitor live chat and the /admin inbox sign-in (token + emailed code); read before changing either.
---

Admin sign-in is two steps: the ADMIN_TOKEN secret (trimmed, at least 24 characters), then a 6-digit code emailed through the Gmail connector to the ADMIN_EMAIL env var. The code challenge is bound to the browser that asked for it by a `__Host-` cookie; codes and tokens are stored only as hashes. A session is tied to the ADMIN_TOKEN in force when it was created, so changing the token signs every admin out.
**Why:** the user asked for "token + 6-digit code via Gmail" plus security hardening.
**How to apply:** never put the code in the email subject; keep Gmail sending on plain fetch; do not add /admin to robots.txt (it would advertise the URL) — the page sets noindex itself.

Chat state lives in the database and both sides poll (visitor thread ~3s, admin list 5s, admin thread 3s); unread is tracked by last-read message id.
**Why:** the app deploys on autoscale, so in-memory sockets or state would split across instances.

The admin screens are Vietnamese only and force `<html lang="vi" dir="ltr">` while mounted; visitor-facing chat text goes into all 33 locales.
**Why:** the only admin reads Vietnamese; visitors may arrive in any of the site languages, including RTL ones.
