---
name: Source samples (pick before ordering)
description: The user's requirements for the package where the buyer picks a source sample, why the picker can be missing, and how to test it.
---

The user asked on 2026-10-15 for a package where the buyer picks a source sample: the admin uploads sample pictures, visitors browse them, and the buyer picks one before paying. Since 2026-10-22 the four templates (Reelmark, Jack, Mainframe, Iris) are the samples, each with a live demo and a source zip. The rules as built are in replit.md.
**Why:** the user's requests.

The picker does not appear while no sample is visible, and database rows do not move from dev to the live site. The four templates are added automatically the first time a server starts on a database (the live one included); any other sample has to be uploaded again on the live `/quan-tri`.
**How to apply:** if the user says the picker or a sample is missing on the live site, check the visible samples there first.

Testing: use the end-to-end recipe in admin-chat.md (second API with a test outbox and a throwaway ADMIN_EMAIL). Delete test samples through the API, which also deletes their files.
**Why:** test samples left in dev would show on the dev site.
