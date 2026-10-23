---
name: Store without Whop (user decisions)
description: User decisions of 2026-10-22 for dropping Whop — bank-transfer payment, required verified accounts, admin sign-in, and the bundled templates sold as source downloads.
---

- Whop is removed from checkout entirely (user's request, 2026-10-22).
- Payment is VietQR bank transfer only; the admin confirms each order by hand when the money arrives. The user chose this after being told foreign buyers can hardly pay that way.
  **Why:** user's choice. Stripe does not onboard Vietnam-registered sellers (checked 2026-10-22), and the user did not want Whop kept for foreign buyers.
- Every buyer must create an account and verify the email before buying. Disposable addresses are blocked; only common email providers are allowed, and the list is editable in the dashboard.
- The admin signs in from the same sign-in form as customers (no separate /admin token page) and lands in a full dashboard.
- The templates built from the user's prompts (Reelmark, Jack, Mainframe, Iris; Michelle and Kin OS from 2026-10-23) are sold on the store; buyers download the source code only, never the prompt.
  **Why:** the user picked "Đưa lên bán, khách mua xong chỉ tải mã nguồn". The 2026-10-23 pair was added the same way without asking; the admin can hide them in "Mẫu source".
- Bank account details are typed in by the admin in the dashboard, never collected in chat or kept in notes.
