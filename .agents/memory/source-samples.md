---
name: Source samples (pick before ordering)
description: The user's requirements for the package where the buyer picks a source sample, why the picker can be missing, and how to test it.
---

The user asked on 2026-10-15 for a package where the buyer picks a source sample: the admin uploads sample pictures, visitors browse them, and the buyer picks one before paying. Since 2026-10-22 the bundled templates are the samples (Reelmark, Jack, Mainframe, Iris; Michelle and Kin OS added 2026-10-23), each with a live demo and a source zip. The rules as built are in replit.md.
**Why:** the user's requests.

The picker does not appear while no sample is visible, and database rows do not move from dev to the live site. Each bundled template is added automatically the first time a server that has it starts on a database (the live one included), and never re-added after the admin deletes it; any other sample has to be uploaded again on the live `/quan-tri`.
**How to apply:** if the user says the picker or a sample is missing on the live site, check the visible samples there first.

Testing: use the end-to-end recipe in admin-chat.md (second API with a test outbox and a throwaway ADMIN_EMAIL). Delete test samples through the API, which also deletes their files.
**Why:** test samples left in dev would show on the dev site.

Changing a bundled template's preview pictures does not update a sample that was already added: its pictures were copied to storage when it was added. On 2026-10-23 the dev Michelle row was refreshed with a one-off script (upload new pictures, update the row, delete the unused old ones; restart the API to drop its in-memory picture cache). The live database had no samples yet then, so publishing adds them with the current pictures.
**How to apply:** after remaking a template preview, check whether that sample already exists in dev and on the live site.
