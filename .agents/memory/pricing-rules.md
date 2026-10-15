---
name: Pricing rules (user-stated)
description: What each package includes, as the user defined it, plus copy decisions for the pricing section and FAQ.
---

User-stated package rules (Oct 2026):
- $12 Personal Source: public source plus a README guide.
- $50 Custom Build: built from the buyer's requirements (Word/README/PDF with images, sketches welcome), 30 days of support, 1 revision.
- $250 All-in-One A–Z: 1 year hosting, 1 year domain, 90 days priority support, everything in the $50 package, 3 revisions.
- Only the $250 package includes hosting and a domain. Every package builds 1 portfolio. Prices are adjusted for each country's VAT.

Decisions:
- Package keys stay personal/setup/commercial; setup stays recommended.
  **Why:** keys tie the USD/VND twin plans and the built-in translations together.
- Cards never show "not included" lines; the hosting-only-in-A–Z rule lives in the pricing note under the cards.
  **Why:** every feature row has a check icon, so a "not included" row would contradict it.
- FAQ Q3 asks how many portfolios a package covers, not whether client use is allowed.
  **Why:** the user never stated a client-use policy; do not invent one.
- VND prices for Custom Build (1.290.000) and All-in-One (6.290.000) are provisional conversions; the user has not confirmed them.
- Open gap: the site does not yet say where Custom Build / A–Z buyers send their requirements.

Refund policy (user-stated 2026-10-15, user's words: "chỉ hoàn tiền khi chưa xác nhận đơn hàng; 1 khi source đã được gửi, đóng chat, mọi phương thức hoàn tiền sẽ bị vô hiệu"):
- Copy keeps exactly that: passive "order not yet confirmed" (never say who confirms), no time window, no partial refunds, no extra conditions.
  **Why:** the user stated only these two rules; anything else would be an invented term in a legal text.
- It lives in four places that must change together: last FAQ item and `pricing.refund` in all 33 locales, the Whop product description, and the Return Policy PDF (`marketing/policy/` → `generated-artifacts/policy/`).
  **How to apply:** append FAQ items (tests and anchors use fixed indices); the SSR test checks the refund text in every language.
- Whop: an account API key cannot update its own account (`PATCH /accounts/{biz}` answers "Account not found"; `/companies/{biz}` rejects `return_policy`), so the PDF must be uploaded by the user in Dashboard > Settings > Legal. Whop auto-refunds bank dispute alerts up to $500 (account payment control, not changeable by API) — that can refund a buyer despite this policy.
