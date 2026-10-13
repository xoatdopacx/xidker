import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, checkoutSessionsTable } from "@workspace/db";
import {
  CreateCheckoutBody,
  CreateCheckoutResponse,
  GetCheckoutStatusParams,
  GetCheckoutStatusResponse,
} from "@workspace/api-zod";
import {
  createWhopCheckout,
  findPaidPayment,
  listPackages,
} from "../lib/whopStore";
import { resolveSiteOrigin } from "../lib/siteOrigin";

// Frontend route that Whop sends the buyer back to after paying.
const THANK_YOU_PATH = "/cam-on";

const router: IRouter = Router();

router.post("/checkout", async (req, res): Promise<void> => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let pkg;
  try {
    const packages = await listPackages();
    pkg = packages.find((p) => p.id === parsed.data.packageId);
  } catch (err) {
    req.log.error({ err }, "Failed to load packages from Whop");
    res.status(503).json({ error: "Checkout is temporarily unavailable" });
    return;
  }
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }

  const ref = randomBytes(16).toString("base64url");
  const redirectUrl = `${resolveSiteOrigin(req)}${THANK_YOU_PATH}?ref=${ref}`;

  let checkout;
  try {
    checkout = await createWhopCheckout({ planId: pkg.id, redirectUrl, ref });
  } catch (err) {
    req.log.error({ err, planId: pkg.id }, "Failed to create Whop checkout");
    res.status(503).json({ error: "Checkout is temporarily unavailable" });
    return;
  }

  await db.insert(checkoutSessionsTable).values({
    ref,
    checkoutConfigurationId: checkout.checkoutConfigurationId,
    planId: pkg.id,
    packageName: pkg.name,
  });

  req.log.info(
    { planId: pkg.id, checkoutConfigurationId: checkout.checkoutConfigurationId },
    "Created Whop checkout",
  );
  res
    .status(201)
    .json(CreateCheckoutResponse.parse({ ref, purchaseUrl: checkout.purchaseUrl }));
});

router.get("/checkout/:ref", async (req, res): Promise<void> => {
  const params = GetCheckoutStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(checkoutSessionsTable)
    .where(eq(checkoutSessionsTable.ref, params.data.ref));
  if (!session) {
    res.status(404).json({ error: "Checkout not found" });
    return;
  }

  let payment;
  try {
    payment = await findPaidPayment(session.checkoutConfigurationId);
  } catch (err) {
    req.log.error({ err }, "Failed to verify payment with Whop");
    res.status(503).json({ error: "Payment status is temporarily unavailable" });
    return;
  }

  res.json(
    GetCheckoutStatusResponse.parse({
      ref: session.ref,
      status: payment ? "paid" : "pending",
      packageId: session.planId,
      packageName: session.packageName,
      amount: payment?.amount ?? null,
      currency: payment?.currency ?? null,
      paidAt: payment?.paidAt ?? null,
    }),
  );
});

export default router;
