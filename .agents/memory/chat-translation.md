---
name: Chat translation
description: Decisions, model findings and the test recipe for the automatic Vietnamese <-> customer-language translation in the support chat; read before changing or testing it.
---

On 2026-10-14 the user asked for automatic translation: a customer's message gets a Vietnamese line under it in the admin chat, and the admin's Vietnamese reply reaches the customer in the customer's language.
**Why:** the only admin reads and writes Vietnamese; buyers write in any of the site languages.

Decisions to keep consistent:
- Customer messages are translated only when the admin inbox asks (automatically on opening a thread, newest first, one batch at a time). Never inside the customer's send, so a slow or broken AI never delays a customer.
- Replies are translated synchronously before saving. On failure the reply is still saved (status failed); the customer reads the Vietnamese and the admin can retry.
- No backfill job: old customer messages translate when the admin opens the thread; old replies stay as they were sent (the customer already read them). The conversation list preview stays the original text.
- The AI module is imported lazily, so missing AI env vars break only translation, not the shop.
**How to apply:** ask the user before moving translation into the customer's send or adding a background backfill.

Model findings (Replit AI Integrations OpenAI proxy, October 2026):
- gpt-6-luna with reasoning_effort "none" and a strict json_schema answers in about 1-2s per message with good quality.
- reasoning_effort "minimal" is rejected by gpt-6-luna, gpt-5.6-luna and gpt-5.4-mini; "none" is rejected by gpt-5-nano and gpt-5-mini.
**How to apply:** before swapping models, check which effort values the new one accepts.

Test recipe (no real admin email, never the real ADMIN_TOKEN):
- Run a second API process on a spare port with a throwaway ADMIN_TOKEN. Insert a support account and session rows directly; the admin session's credential hash is HMAC(SESSION_SECRET, "admin-token:" + the throwaway token). Afterwards delete the account (its sessions, conversation and messages cascade) and the admin_sessions row.
- Failure path: start that process with AI_INTEGRATIONS_OPENAI_BASE_URL blanked. The server still boots; customer messages come back failed and replies are saved as failed.
- Real UI end to end: drive headless chromium over CDP, enable Fetch for `*/api/*`, forward each paused request from Node to the test port with both test cookies added and the Origin header removed (same-origin check), then fulfill with the real answer. This shows real translations in /admin and in the customer panel without signing in through the UI.
