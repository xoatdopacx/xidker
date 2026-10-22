import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, ordersTable, supportAccountsTable, type OrderRow, type SupportAccountRow } from "@workspace/db";
import {
  CancelMyOrderParams,
  CancelMyOrderResponse,
  CreateOrderBody,
  CreateOrderResponse,
  DownloadOrderFileParams,
  GetMyOrderParams,
  GetMyOrderResponse,
  ListMyOrdersResponse,
  ReportOrderTransferParams,
  ReportOrderTransferResponse,
} from "@workspace/api-zod";
import { limitByIp, requireSameOrigin } from "../lib/security";
import { accountOf, adminEmail, recordEvent, requireAccount } from "../lib/accounts";
import { findPackage, packageText } from "../lib/catalog";
import { findVisibleSample, hasVisibleSamples } from "../lib/samples";
import { getBank } from "../lib/settings";
import {
  MAX_ORDERS_PER_DAY,
  MAX_PENDING_ORDERS,
  newOrderCode,
  orderFile,
  orderSummaries,
  orderView,
} from "../lib/orders";
import { adminNewOrderEmail, adminTransferReportedEmail, orderCreatedEmail } from "../lib/emails";
import { deliverInBackground } from "../lib/mailOut";
import { resolveSiteOrigin } from "../lib/siteOrigin";
import { sendStoredFile } from "../lib/storedFiles";
import { fail, isUniqueViolation } from "../lib/http";

// A signed-in customer's orders: place one, see how to pay, say the money was sent, cancel
// before that, and download the source code once the admin confirmed the payment.

const router: IRouter = Router();

const langOf = (account: SupportAccountRow) => account.lang ?? "vi";

async function ownOrder(res: Response, code: string): Promise<OrderRow | null> {
  const [row] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.code, code), eq(ordersTable.accountId, accountOf(res).id)))
    .limit(1);
  return row ?? null;
}

function adminNotice(req: Request, row: OrderRow) {
  return {
    code: row.code,
    email: row.email,
    packageName: row.packageName,
    sampleName: row.sampleName,
    amount: row.amount,
    url: `${resolveSiteOrigin(req)}/quan-tri`,
  };
}

router.get("/orders", requireAccount, async (_req, res): Promise<void> => {
  const account = accountOf(res);
  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.accountId, account.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(100);
  res.json(ListMyOrdersResponse.parse(await orderSummaries(rows, langOf(account))));
});

router.post(
  "/orders",
  requireSameOrigin,
  requireAccount,
  limitByIp("orders-create", 60 * 60_000, 30),
  async (req, res): Promise<void> => {
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "invalid_input", "Invalid input");
      return;
    }
    const account = accountOf(res);
    const { lang, packageId, sampleId } = parsed.data;
    if (!(await getBank())) {
      fail(res, 503, "payments_off", "Payments are not set up yet");
      return;
    }
    const pkg = await findPackage(packageId);
    if (!pkg || !pkg.visible) {
      fail(res, 404, "package_gone", "This package is no longer on sale");
      return;
    }
    let sample = null;
    if (pkg.pickSample && (await hasVisibleSamples())) {
      if (!sampleId) {
        fail(res, 400, "sample_required", "Pick a sample first");
        return;
      }
      sample = await findVisibleSample(sampleId);
      if (!sample) {
        fail(res, 404, "sample_gone", "This sample is no longer available");
        return;
      }
    }

    const [[pending], [today]] = await Promise.all([
      db
        .select({ n: count() })
        .from(ordersTable)
        .where(and(eq(ordersTable.accountId, account.id), eq(ordersTable.status, "pending"))),
      db
        .select({ n: count() })
        .from(ordersTable)
        .where(and(eq(ordersTable.accountId, account.id), gt(ordersTable.createdAt, sql`now() - interval '1 day'`))),
    ]);
    if (pending.n >= MAX_PENDING_ORDERS) {
      fail(res, 409, "pending_limit", "Too many unpaid orders");
      return;
    }
    if (today.n >= MAX_ORDERS_PER_DAY) {
      fail(res, 429, "too_many", "Too many orders today");
      return;
    }

    let row: OrderRow | undefined;
    for (let attempt = 0; !row && attempt < 5; attempt += 1) {
      try {
        [row] = await db
          .insert(ordersTable)
          .values({
            id: randomUUID(),
            code: newOrderCode(),
            accountId: account.id,
            email: account.email,
            packageKey: pkg.key,
            packageName: pkg.textVi.name,
            sampleId: sample?.id ?? null,
            sampleName: sample?.name ?? null,
            sampleFile: sample?.sourceFile ?? null,
            amount: pkg.priceVnd,
            lang,
          })
          .returning();
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
    if (!row) throw new Error("Could not find a free order code");
    await db.update(supportAccountsTable).set({ lang }).where(eq(supportAccountsTable.id, account.id));
    await recordEvent("order_created", req, account.email);
    req.log.info({ code: row.code, packageKey: pkg.key }, "Order placed");

    const url = `${resolveSiteOrigin(req)}/don-hang/${row.code}?lang=${lang}`;
    deliverInBackground(
      row.email,
      orderCreatedEmail(lang, { code: row.code, packageName: packageText(pkg, lang).name, amount: row.amount, url }),
      "order placed (buyer)",
    );
    const admin = adminEmail();
    if (admin) deliverInBackground(admin, adminNewOrderEmail(adminNotice(req, row)), "order placed (admin)");

    res.status(201).json(CreateOrderResponse.parse(await orderView(row, lang)));
  },
);

router.get("/orders/:code", requireAccount, async (req, res): Promise<void> => {
  const params = GetMyOrderParams.safeParse(req.params);
  const row = params.success ? await ownOrder(res, params.data.code) : null;
  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetMyOrderResponse.parse(await orderView(row, langOf(accountOf(res)))));
});

router.post(
  "/orders/:code/transferred",
  requireSameOrigin,
  requireAccount,
  limitByIp("orders-transferred", 60 * 60_000, 30),
  async (req, res): Promise<void> => {
    const params = ReportOrderTransferParams.safeParse(req.params);
    const row = params.success ? await ownOrder(res, params.data.code) : null;
    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (row.status === "cancelled") {
      res.status(409).json({ error: "This order was cancelled" });
      return;
    }
    let current = row;
    if (row.status === "pending" && !row.transferReportedAt) {
      const [updated] = await db
        .update(ordersTable)
        .set({ transferReportedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(ordersTable.id, row.id), eq(ordersTable.status, "pending"), isNull(ordersTable.transferReportedAt)))
        .returning();
      if (updated) {
        current = updated;
        req.log.info({ code: row.code }, "Buyer says the money was sent");
        const admin = adminEmail();
        if (admin) deliverInBackground(admin, adminTransferReportedEmail(adminNotice(req, updated)), "transfer reported (admin)");
      }
    }
    res.json(ReportOrderTransferResponse.parse(await orderView(current, langOf(accountOf(res)))));
  },
);

router.post(
  "/orders/:code/cancel",
  requireSameOrigin,
  requireAccount,
  limitByIp("orders-cancel", 60 * 60_000, 30),
  async (req, res): Promise<void> => {
    const params = CancelMyOrderParams.safeParse(req.params);
    const row = params.success ? await ownOrder(res, params.data.code) : null;
    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    // Once the buyer says the money is on its way, only the admin can cancel.
    const [updated] = await db
      .update(ordersTable)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(ordersTable.id, row.id), eq(ordersTable.status, "pending"), isNull(ordersTable.transferReportedAt)))
      .returning();
    if (!updated) {
      fail(res, 409, "not_cancellable", "This order can no longer be cancelled");
      return;
    }
    req.log.info({ code: row.code }, "Buyer cancelled an order");
    res.json(CancelMyOrderResponse.parse(await orderView(updated, langOf(accountOf(res)))));
  },
);

router.get(
  "/orders/:code/download",
  requireAccount,
  limitByIp("orders-download", 60 * 60_000, 60),
  async (req, res): Promise<void> => {
    const params = DownloadOrderFileParams.safeParse(req.params);
    const row = params.success ? await ownOrder(res, params.data.code) : null;
    const file = row?.status === "paid" ? await orderFile(row) : null;
    if (!row || !file) {
      res.status(404).json({ error: "Nothing to download for this order" });
      return;
    }
    if (!(await sendStoredFile(res, file))) {
      req.log.error({ code: row.code, kind: file.kind }, "The file of a paid order is missing");
      res.status(404).json({ error: "The file is missing, message us in the chat" });
      return;
    }
    await db
      .update(ordersTable)
      .set({ downloads: sql`${ordersTable.downloads} + 1` })
      .where(eq(ordersTable.id, row.id));
  },
);

export default router;
