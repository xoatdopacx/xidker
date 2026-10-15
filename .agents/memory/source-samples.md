---
name: Source samples (pick before paying)
description: The user's requirements for the package where the buyer picks a source sample, why the picker can be missing, and how to test it without the real admin key.
---

The user asked on 2026-10-15 for a $12 package where the buyer picks a source sample: the admin uploads sample pictures, visitors browse them, and the buyer picks one before paying. The support chat stays buyers-only. The rules as built are in replit.md.
**Why:** the user's request.

The picker does not appear while no sample is visible, and database rows do not move from dev to the live site. After publishing, the admin has to upload samples again on the live /admin before buyers see the picker.
**How to apply:** if the user says the picker is missing on the live site, check for visible samples there first.

Testing without the real ADMIN_TOKEN: run a second API process from the built dist on another port with a throwaway ADMIN_TOKEN and ADMIN_EMAIL=test@example.invalid, sign in with a test admin_sessions row made with the server's own hashing, and send POSTs with the dev-domain Origin. Afterwards delete the test samples through the API (that also deletes their files) and the test admin_sessions row, then stop the process.
**Why:** the real key must never be used for tests, and test samples left in dev would show on the dev site.
