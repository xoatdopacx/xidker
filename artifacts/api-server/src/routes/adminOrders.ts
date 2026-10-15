import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, checkoutSessionsTable } from "@workspace/db";
import { ListAdminOrdersResponse } from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";
import { listPackages, recentPaidPayments } from "../lib/whopStore";

const router: IRouter = Router();

/** Recent paid orders from Whop, with the sample each buyer picked on this site. */
router.get("/admin/orders", requireAdmin, async (req, res): Promise<void> => {
  let payments;
  try {
    payments = await recentPaidPayments(50);
  } catch (err) {
    req.log.error({ err }, "Failed to load recent orders from Whop");
    res.status(503).json({ error: "Payment provider unavailable" });
    return;
  }

  const configIds = payments.flatMap((p) => (p.checkoutConfigurationId ? [p.checkoutConfigurationId] : []));
  const sessions = configIds.length
    ? await db
        .select({
          checkoutConfigurationId: checkoutSessionsTable.checkoutConfigurationId,
          packageName: checkoutSessionsTable.packageName,
          sampleName: checkoutSessionsTable.sampleName,
        })
        .from(checkoutSessionsTable)
        .where(inArray(checkoutSessionsTable.checkoutConfigurationId, configIds))
    : [];
  const byConfig = new Map(sessions.map((s) => [s.checkoutConfigurationId, s]));

  // Current Vietnamese names for packages still on sale; the checkout's saved name otherwise.
  const names = new Map<string, string>();
  try {
    for (const p of await listPackages("vi")) names.set(p.id, p.name);
  } catch (err) {
    req.log.warn({ err }, "Package names unavailable for the order list");
  }

  res.json(
    ListAdminOrdersResponse.parse(
      payments.map((p) => {
        const session = p.checkoutConfigurationId ? byConfig.get(p.checkoutConfigurationId) : undefined;
        return {
          id: p.id,
          paidAt: p.paidAt,
          amount: p.amount,
          currency: p.currency,
          email: p.email,
          packageName: (p.planId ? names.get(p.planId) : undefined) ?? session?.packageName ?? null,
          sampleName: session?.sampleName ?? p.sampleName,
        };
      }),
    ),
  );
});

export default router;
