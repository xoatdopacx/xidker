---
name: Backend gotchas (drizzle, lib typecheck)
description: Non-obvious traps hit while writing API queries and changing the shared database schema in this monorepo.
---

Drizzle prints column names unqualified in single-table selects. Inside a correlated subquery, a reference such as `${outerTable.id}` then binds to the inner table's column of the same name instead of the outer row. Spell outer columns as qualified raw SQL (`sql.raw('"table"."column"')`).
**Why:** hit while writing the admin inbox's per-conversation subqueries (unread count, last message).
**How to apply:** any `sql` subquery that refers back to the outer query's table.

After changing the shared database schema, run `pnpm -w run typecheck:libs` before typechecking the API server; it reads the libraries' built type declarations, so it reports stale "does not exist" errors until they are rebuilt.
