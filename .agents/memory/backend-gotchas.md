---
name: Backend gotchas (drizzle, lib typecheck)
description: Non-obvious traps hit while writing API queries and changing the shared database schema in this monorepo.
---

Drizzle prints column names unqualified in single-table selects. Inside a correlated subquery, a reference such as `${outerTable.id}` then binds to the inner table's column of the same name instead of the outer row. Spell outer columns as qualified raw SQL (`sql.raw('"table"."column"')`).
**Why:** hit while writing the admin inbox's per-conversation subqueries (unread count, last message).
**How to apply:** any `sql` subquery that refers back to the outer query's table.

After changing the shared database schema, run `pnpm -w run typecheck:libs` before typechecking the API server; it reads the libraries' built type declarations, so it reports stale "does not exist" errors until they are rebuilt.

App Storage: avoid the storage library's `exists()`, `download()` and `createReadStream()` on request paths. They are slow and log MaxListenersExceededWarning when several run at once. Sample pictures are read with one authorized fetch to the storage JSON API (`?alt=media`) instead.
**Why:** hit while serving sample pictures to the picker and the admin screen.
**How to apply:** any new code that reads stored files while a visitor waits.
