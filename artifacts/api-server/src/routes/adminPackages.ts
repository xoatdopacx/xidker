import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, storePackagesTable, type PackageTextRow } from "@workspace/db";
import {
  CreateAdminPackageBody,
  CreateAdminPackageResponse,
  DeleteAdminPackageParams,
  ListAdminPackagesResponse,
  UpdateAdminPackageBody,
  UpdateAdminPackageParams,
  UpdateAdminPackageResponse,
} from "@workspace/api-zod";
import { cleanLine, limitByIp, requireSameOrigin } from "../lib/security";
import { requireAdmin } from "../lib/adminAuth";
import {
  adminPackage,
  allPackages,
  clearCatalogCache,
  clearOtherRecommended,
  findPackage,
  newPackageKey,
  orderCounts,
} from "../lib/catalog";

// The price list, edited in the dashboard. Buyers' orders keep a copy of the package name and
// price, so changing or removing a package never changes an order already placed.

const router: IRouter = Router();
const limitWrites = limitByIp("admin-packages", 60_000, 30);

type TextInput = { name: string; tagline: string | null; features: string[] };

/** Trimmed text; null when the name ends up empty. */
function cleanPackageText(input: TextInput): PackageTextRow | null {
  const name = cleanLine(input.name);
  if (!name) return null;
  const tagline = cleanLine(input.tagline ?? "") || null;
  const features = input.features.map(cleanLine).filter(Boolean);
  return { name, tagline, features };
}

type PackageInput = {
  vi: TextInput;
  en: TextInput;
  priceVnd: number;
  priceUsd: number | null;
  visible: boolean;
  recommended: boolean;
  pickSample: boolean;
};

function packageValues(input: PackageInput) {
  const textVi = cleanPackageText(input.vi);
  const textEn = cleanPackageText(input.en);
  if (!textVi || !textEn) return null;
  return {
    textVi,
    textEn,
    priceVnd: input.priceVnd,
    priceUsd: input.priceUsd === null ? null : Math.round(input.priceUsd * 100) / 100,
    visible: input.visible,
    // A hidden package cannot be the one recommended to visitors.
    recommended: input.recommended && input.visible,
    pickSample: input.pickSample,
  };
}

router.get("/admin/packages", requireAdmin, async (_req, res): Promise<void> => {
  const [rows, counts] = await Promise.all([allPackages(), orderCounts()]);
  res.json(ListAdminPackagesResponse.parse(rows.map((row) => adminPackage(row, counts.get(row.key) ?? 0))));
});

router.post("/admin/packages", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const body = CreateAdminPackageBody.safeParse(req.body);
  const values = body.success ? packageValues(body.data) : null;
  if (!values) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const taken = new Set((await allPackages()).map((row) => row.key));
  const key = newPackageKey(values.textEn.name, taken);
  const [row] = await db.insert(storePackagesTable).values({ key, ...values }).returning();
  if (row.recommended) await clearOtherRecommended(row.key);
  clearCatalogCache();
  req.log.info({ key }, "Admin added a package");
  res.status(201).json(CreateAdminPackageResponse.parse(adminPackage(row, 0)));
});

router.put("/admin/packages/:key", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = UpdateAdminPackageParams.safeParse(req.params);
  const body = UpdateAdminPackageBody.safeParse(req.body);
  const values = body.success ? packageValues(body.data) : null;
  if (!params.success || !values) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db
    .update(storePackagesTable)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(storePackagesTable.key, params.data.key))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  if (row.recommended) await clearOtherRecommended(row.key);
  clearCatalogCache();
  req.log.info({ key: row.key }, "Admin changed a package");
  const counts = await orderCounts();
  res.json(UpdateAdminPackageResponse.parse(adminPackage(row, counts.get(row.key) ?? 0)));
});

router.delete("/admin/packages/:key", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = DeleteAdminPackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const row = await findPackage(params.data.key);
  if (!row) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  if ((await orderCounts()).get(row.key)) {
    res.status(409).json({ error: "This package has orders, hide it instead" });
    return;
  }
  await db.delete(storePackagesTable).where(eq(storePackagesTable.key, row.key));
  clearCatalogCache();
  req.log.info({ key: row.key }, "Admin deleted a package");
  res.status(204).end();
});

export default router;
