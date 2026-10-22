import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  chatConversationsTable,
  chatMessagesTable,
  ordersTable,
  supportAccountsTable,
  type OrderRow,
  type StoredFileRow,
  type SupportAccountRow,
} from "@workspace/db";
import {
  GetAdminOverviewResponse,
  GetAdminSettingsResponse,
  ListAdminCustomersQueryParams,
  ListAdminCustomersResponse,
  ListAdminOrdersQueryParams,
  ListAdminOrdersResponse,
  ListBanksResponse,
  ListBuiltinFilesResponse,
  UpdateAdminBankBody,
  UpdateAdminBankResponse,
  UpdateAdminCustomerBody,
  UpdateAdminCustomerParams,
  UpdateAdminCustomerResponse,
  UpdateAdminEmailDomainsBody,
  UpdateAdminEmailDomainsResponse,
  UpdateAdminOrderBody,
  UpdateAdminOrderParams,
  UpdateAdminOrderResponse,
} from "@workspace/api-zod";
import { cleanText, limitByIp, requireSameOrigin } from "../lib/security";
import { endAdminSessionsOf, requireAdmin } from "../lib/adminAuth";
import { adminEmail, endAllSessions, isAdminEmail } from "../lib/accounts";
import { adminOrderViews, orderFile, packageNameFor } from "../lib/orders";
import { BANKS } from "../lib/vietqrBanks";
import { bankAccountName, bankByBin } from "../lib/vietqr";
import { cleanDomains, getBank, getEmailDomains, mailWorking, setBank, setEmailDomains } from "../lib/settings";
import { StoredFileError, listBuiltinFiles, resolveStoredFile } from "../lib/storedFiles";
import { deleteUnusedObjects } from "../lib/samples";
import { orderPaidEmail } from "../lib/emails";
import { deliverInBackground } from "../lib/mailOut";
import { resolveSiteOrigin } from "../lib/siteOrigin";

// The admin dashboard: overview, orders (confirm payments, deliver files), customers and
// settings (bank account for the QR codes, email providers allowed to sign up).

const router: IRouter = Router();
const limitWrites = limitByIp("admin-store", 60_000, 60);

// Days and months follow the shop's clock, not the server's.
const TZ = sql.raw(`'Asia/Ho_Chi_Minh'`);
const localNow = sql`(now() at time zone ${TZ})`;
const money = (expr: SQL) => sql<number>`coalesce(${expr}, 0)::float8`.mapWith(Number);
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

/* ---------------- overview ---------------- */

router.get("/admin/overview", requireAdmin, async (_req, res): Promise<void> => {
  const o = ordersTable;
  const paidLocal = sql`(${o.paidAt} at time zone ${TZ})`;
  const thisMonth = sql`date_trunc('month', ${paidLocal}) = date_trunc('month', ${localNow})`;
  const admin = adminEmail() ?? "";

  const [[orders], [customers], [unread], days, recent, bank, mailReady] = await Promise.all([
    db
      .select({
        waiting: sql<number>`count(*) filter (where ${o.status} = 'pending' and ${o.transferReportedAt} is null)::int`,
        reported: sql<number>`count(*) filter (where ${o.status} = 'pending' and ${o.transferReportedAt} is not null)::int`,
        revenueToday: money(sql`sum(${o.amount}) filter (where ${o.status} = 'paid' and ${paidLocal}::date = ${localNow}::date)`),
        revenueMonth: money(sql`sum(${o.amount}) filter (where ${o.status} = 'paid' and ${thisMonth})`),
        revenueTotal: money(sql`sum(${o.amount}) filter (where ${o.status} = 'paid')`),
        paidMonth: sql<number>`count(*) filter (where ${o.status} = 'paid' and ${thisMonth})::int`,
      })
      .from(o),
    db
      .select({
        total: sql<number>`count(*)::int`,
        week: sql<number>`count(*) filter (where ${supportAccountsTable.createdAt} > now() - interval '7 days')::int`,
      })
      .from(supportAccountsTable)
      .where(and(isNotNull(supportAccountsTable.emailVerifiedAt), ne(supportAccountsTable.email, admin))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(chatMessagesTable)
      .innerJoin(chatConversationsTable, eq(chatConversationsTable.id, chatMessagesTable.conversationId))
      .where(and(eq(chatMessagesTable.sender, "visitor"), sql`${chatMessagesTable.id} > ${chatConversationsTable.adminLastReadId}`)),
    db.execute<{ date: string; revenue: number; orders: number }>(sql`
      select to_char(d, 'YYYY-MM-DD') as date,
             coalesce(sum(o.amount), 0)::float8 as revenue,
             count(o.id)::int as orders
      from generate_series(${localNow}::date - 13, ${localNow}::date, interval '1 day') d
      left join ${ordersTable} o on o.status = 'paid' and (o.paid_at at time zone ${TZ})::date = d::date
      group by d
      order by d`),
    db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(8),
    getBank(),
    mailWorking(),
  ]);

  res.json(
    GetAdminOverviewResponse.parse({
      waitingOrders: orders.waiting,
      reportedOrders: orders.reported,
      revenueToday: orders.revenueToday,
      revenueMonth: orders.revenueMonth,
      revenueTotal: orders.revenueTotal,
      paidMonth: orders.paidMonth,
      customers: customers.total,
      newCustomersWeek: customers.week,
      unreadMessages: unread.n,
      bankReady: bank !== null,
      mailReady,
      days: days.rows.map((day) => ({ date: day.date, revenue: Number(day.revenue), orders: Number(day.orders) })),
      recentOrders: await adminOrderViews(recent),
    }),
  );
});

/* ---------------- orders ---------------- */

router.get("/admin/orders", requireAdmin, async (req, res): Promise<void> => {
  const query = ListAdminOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { status = "all", q } = query.data;
  const conditions: SQL[] = [];
  if (status === "waiting") conditions.push(and(eq(ordersTable.status, "pending"), isNull(ordersTable.transferReportedAt))!);
  if (status === "reported") conditions.push(and(eq(ordersTable.status, "pending"), isNotNull(ordersTable.transferReportedAt))!);
  if (status === "paid" || status === "cancelled") conditions.push(eq(ordersTable.status, status));
  const search = q?.trim();
  if (search) conditions.push(or(ilike(ordersTable.code, likePattern(search)), ilike(ordersTable.email, likePattern(search)))!);
  const rows = await db
    .select()
    .from(ordersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(300);
  res.json(ListAdminOrdersResponse.parse(await adminOrderViews(rows)));
});

// What the admin may do with an order. Paid ↔ cancelled always goes through "not paid yet".
const ALLOWED: Record<OrderRow["status"], OrderRow["status"][]> = {
  pending: ["paid", "cancelled"],
  paid: ["pending"],
  cancelled: ["pending"],
};

const sameFile = (input: { kind: string; slug?: string; path?: string }, current: StoredFileRow | null) =>
  current !== null &&
  input.kind === current.kind &&
  (current.kind === "upload" ? input.path === current.path : input.slug === current.slug);

router.patch("/admin/orders/:code", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = UpdateAdminOrderParams.safeParse(req.params);
  const body = UpdateAdminOrderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.code, params.data.code)).limit(1);
  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const input = body.data;
  const changes: Partial<typeof ordersTable.$inferInsert> = { updatedAt: new Date() };

  const nextStatus = input.status && input.status !== row.status ? input.status : null;
  if (nextStatus) {
    if (!ALLOWED[row.status].includes(nextStatus)) {
      res.status(409).json({ error: "Move the order back to “not paid yet” first" });
      return;
    }
    changes.status = nextStatus;
    changes.paidAt = nextStatus === "paid" ? new Date() : null;
    changes.cancelledAt = nextStatus === "cancelled" ? new Date() : null;
  }
  if (input.deliveryFile !== undefined) {
    try {
      changes.deliveryFile =
        input.deliveryFile === null
          ? null
          : sameFile(input.deliveryFile, row.deliveryFile)
            ? row.deliveryFile
            : await resolveStoredFile(input.deliveryFile);
    } catch (err) {
      if (err instanceof StoredFileError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }
  if (input.deliveryNote !== undefined) changes.deliveryNote = cleanText(input.deliveryNote ?? "") || null;
  if (input.adminNote !== undefined) changes.adminNote = cleanText(input.adminNote ?? "") || null;

  // Only if nobody changed the status meanwhile (another tab, a buyer cancelling).
  const [saved] = await db
    .update(ordersTable)
    .set(changes)
    .where(and(eq(ordersTable.id, row.id), eq(ordersTable.status, row.status)))
    .returning();
  if (!saved) {
    res.status(409).json({ error: "The order changed meanwhile, reload the list" });
    return;
  }
  req.log.info({ code: saved.code, from: row.status, to: saved.status }, "Admin updated an order");

  if (nextStatus === "paid") {
    const file = await orderFile(saved);
    deliverInBackground(
      saved.email,
      orderPaidEmail(saved.lang, {
        code: saved.code,
        packageName: await packageNameFor(saved, saved.lang),
        url: `${resolveSiteOrigin(req)}/don-hang/${saved.code}?lang=${saved.lang}`,
        hasFile: file !== null,
      }),
      "order paid (buyer)",
    );
  }
  if (row.deliveryFile?.kind === "upload" && changes.deliveryFile !== undefined && changes.deliveryFile !== row.deliveryFile) {
    await deleteUnusedObjects([row.deliveryFile.path]);
  }
  const [view] = await adminOrderViews([saved]);
  res.json(UpdateAdminOrderResponse.parse(view));
});

/* ---------------- customers ---------------- */

const outerAccount = sql.raw(`"support_accounts"."id"`);
const customerColumns = {
  account: supportAccountsTable,
  orders: sql<number>`(select count(*)::int from ${ordersTable} o where o.account_id = ${outerAccount})`,
  paidOrders: sql<number>`(select count(*)::int from ${ordersTable} o where o.account_id = ${outerAccount} and o.status = 'paid')`,
  spent: sql<number>`(select coalesce(sum(o.amount), 0)::float8 from ${ordersTable} o where o.account_id = ${outerAccount} and o.status = 'paid')`.mapWith(Number),
};

function customerView(row: { account: SupportAccountRow; orders: number; paidOrders: number; spent: number }) {
  const { account } = row;
  return {
    id: account.id,
    email: account.email,
    verified: account.emailVerifiedAt !== null,
    locked: account.disabledAt !== null,
    isAdmin: isAdminEmail(account.email),
    lang: account.lang,
    createdAt: account.createdAt,
    lastSignInAt: account.lastSignInAt,
    orders: row.orders,
    paidOrders: row.paidOrders,
    spent: row.spent,
    legacyOrderId: account.orderId,
  };
}

router.get("/admin/customers", requireAdmin, async (req, res): Promise<void> => {
  const query = ListAdminCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const search = query.data.q?.trim();
  const rows = await db
    .select(customerColumns)
    .from(supportAccountsTable)
    .where(search ? ilike(supportAccountsTable.email, likePattern(search)) : undefined)
    .orderBy(desc(supportAccountsTable.createdAt))
    .limit(300);
  res.json(ListAdminCustomersResponse.parse(rows.map(customerView)));
});

router.patch("/admin/customers/:id", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = UpdateAdminCustomerParams.safeParse(req.params);
  const body = UpdateAdminCustomerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [account] = await db.select().from(supportAccountsTable).where(eq(supportAccountsTable.id, params.data.id)).limit(1);
  if (!account) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  if (isAdminEmail(account.email)) {
    res.status(403).json({ error: "The admin account cannot be locked" });
    return;
  }
  const { locked } = body.data;
  await db
    .update(supportAccountsTable)
    .set({ disabledAt: locked ? (account.disabledAt ?? new Date()) : null })
    .where(eq(supportAccountsTable.id, account.id));
  if (locked) {
    await Promise.all([endAllSessions(account.id), endAdminSessionsOf(account.id)]);
  }
  req.log.info({ accountId: account.id, locked }, "Admin changed a customer");
  const [row] = await db.select(customerColumns).from(supportAccountsTable).where(eq(supportAccountsTable.id, account.id));
  res.json(UpdateAdminCustomerResponse.parse(customerView(row)));
});

/* ---------------- files and settings ---------------- */

router.get("/admin/builtin-files", requireAdmin, async (_req, res): Promise<void> => {
  res.json(ListBuiltinFilesResponse.parse(await listBuiltinFiles()));
});

router.get("/admin/banks", requireAdmin, (_req, res): void => {
  res.json(ListBanksResponse.parse(BANKS));
});

async function settingsView() {
  const [bank, emailDomains] = await Promise.all([getBank(), getEmailDomains()]);
  const info = bank ? bankByBin(bank.bin) : null;
  return {
    bank: bank && info ? { ...bank, bankName: info.shortName } : null,
    emailDomains,
    adminEmail: adminEmail() ?? "",
  };
}

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  res.json(GetAdminSettingsResponse.parse(await settingsView()));
});

router.put("/admin/settings/bank", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const body = UpdateAdminBankBody.safeParse(req.body);
  const accountName = body.success ? bankAccountName(body.data.accountName) : "";
  if (!body.success || !bankByBin(body.data.bin) || accountName.length < 2) {
    res.status(400).json({ error: "Check the bank, account number and account name" });
    return;
  }
  await setBank({ bin: body.data.bin, accountNumber: body.data.accountNumber, accountName });
  req.log.info({ bin: body.data.bin }, "Admin changed the bank account");
  res.json(UpdateAdminBankResponse.parse(await settingsView()));
});

router.put("/admin/settings/email-domains", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const body = UpdateAdminEmailDomainsBody.safeParse(req.body);
  const domains = body.success ? cleanDomains(body.data.domains) : null;
  if (!domains) {
    res.status(400).json({ error: "One of the lines is not an email domain (like gmail.com)" });
    return;
  }
  await setEmailDomains(domains);
  req.log.info({ count: domains.length }, "Admin changed the allowed email providers");
  res.json(UpdateAdminEmailDomainsResponse.parse(await settingsView()));
});

export default router;
