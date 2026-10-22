import { randomInt } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, sourceSamplesTable, storePackagesTable, type OrderRow, type StoredFileRow } from "@workspace/db";
import { getBank } from "./settings";
import { bankByBin, vietQrImage, vietQrPayload } from "./vietqr";
import { packageText } from "./catalog";
import { storedFileView } from "./samples";

// Orders paid by bank transfer. The order code is the transfer memo; the admin marks the order
// paid by hand once the money shows up. Once paid, the buyer downloads the source code.

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ORDER_CODE_RE = /^XID[0-9A-Z]{6}$/;
export const MAX_PENDING_ORDERS = 3;
export const MAX_ORDERS_PER_DAY = 10;

export function newOrderCode(): string {
  let code = "XID";
  for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return code;
}

/** For each order: the sample's current source file (newer uploads reach earlier buyers). */
async function currentSampleFiles(rows: OrderRow[]): Promise<Map<string, StoredFileRow | null>> {
  const ids = [...new Set(rows.filter((row) => row.sampleId && !row.deliveryFile).map((row) => row.sampleId!))];
  if (ids.length === 0) return new Map();
  const samples = await db
    .select({ id: sourceSamplesTable.id, sourceFile: sourceSamplesTable.sourceFile })
    .from(sourceSamplesTable)
    .where(inArray(sourceSamplesTable.id, ids));
  return new Map(samples.map((sample) => [sample.id, sample.sourceFile]));
}

/** What the buyer downloads once paid: the file attached to the order, else the sample's. */
function fileFor(row: OrderRow, sampleFiles: Map<string, StoredFileRow | null>): StoredFileRow | null {
  return row.deliveryFile ?? (row.sampleId ? sampleFiles.get(row.sampleId) : null) ?? row.sampleFile ?? null;
}

export async function orderFiles(rows: OrderRow[]): Promise<(StoredFileRow | null)[]> {
  const sampleFiles = await currentSampleFiles(rows);
  return rows.map((row) => fileFor(row, sampleFiles));
}

export async function orderFile(row: OrderRow): Promise<StoredFileRow | null> {
  return (await orderFiles([row]))[0];
}

/** Package names in the buyer's language, for packages that still exist. */
async function packageNames(rows: OrderRow[], lang: string): Promise<Map<string, string>> {
  const keys = [...new Set(rows.map((row) => row.packageKey))];
  if (keys.length === 0) return new Map();
  const packages = await db.select().from(storePackagesTable).where(inArray(storePackagesTable.key, keys));
  return new Map(packages.map((pkg) => [pkg.key, packageText(pkg, lang).name]));
}

export async function packageNameFor(row: OrderRow, lang: string): Promise<string> {
  return (await packageNames([row], lang)).get(row.packageKey) ?? row.packageName;
}

async function paymentFor(row: OrderRow) {
  if (row.status !== "pending") return null;
  const bank = await getBank();
  const info = bank ? bankByBin(bank.bin) : null;
  if (!bank || !info) return null;
  const payload = vietQrPayload({ bin: bank.bin, accountNumber: bank.accountNumber, amount: row.amount, memo: row.code });
  return {
    bankName: info.shortName,
    bankFullName: info.name,
    accountNumber: bank.accountNumber,
    accountName: bank.accountName,
    amount: row.amount,
    memo: row.code,
    qr: await vietQrImage(payload),
  };
}

/** The order as its buyer sees it. */
export async function orderView(row: OrderRow, lang: string) {
  const [file] = row.status === "paid" ? await orderFiles([row]) : [null];
  return {
    code: row.code,
    status: row.status,
    packageId: row.packageKey,
    packageName: await packageNameFor(row, lang),
    sampleName: row.sampleName,
    amount: row.amount,
    createdAt: row.createdAt,
    transferReportedAt: row.transferReportedAt,
    paidAt: row.paidAt,
    cancelledAt: row.cancelledAt,
    payment: await paymentFor(row),
    file: file ? { name: file.name, size: file.size } : null,
    deliveryNote: row.status === "paid" ? row.deliveryNote : null,
    canCancel: row.status === "pending" && !row.transferReportedAt,
  };
}

export async function orderSummaries(rows: OrderRow[], lang: string) {
  const [files, names] = await Promise.all([orderFiles(rows), packageNames(rows, lang)]);
  return rows.map((row, i) => ({
    code: row.code,
    status: row.status,
    packageName: names.get(row.packageKey) ?? row.packageName,
    sampleName: row.sampleName,
    amount: row.amount,
    createdAt: row.createdAt,
    transferReportedAt: row.transferReportedAt,
    paidAt: row.paidAt,
    hasFile: row.status === "paid" && files[i] !== null,
  }));
}

export async function adminOrderViews(rows: OrderRow[]) {
  const files = await orderFiles(rows);
  return rows.map((row, i) => ({
    code: row.code,
    status: row.status,
    email: row.email,
    accountId: row.accountId,
    packageKey: row.packageKey,
    packageName: row.packageName,
    sampleName: row.sampleName,
    amount: row.amount,
    lang: row.lang,
    createdAt: row.createdAt,
    transferReportedAt: row.transferReportedAt,
    paidAt: row.paidAt,
    cancelledAt: row.cancelledAt,
    file: storedFileView(files[i]),
    deliveryFile: storedFileView(row.deliveryFile),
    deliveryNote: row.deliveryNote,
    adminNote: row.adminNote,
    downloads: row.downloads,
  }));
}
