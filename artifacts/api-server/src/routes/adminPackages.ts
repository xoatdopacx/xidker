import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateAdminPackageBody,
  CreateAdminPackageResponse,
  DeleteAdminPackageParams,
  ListAdminPackagesResponse,
  UpdateAdminPackageBody,
  UpdateAdminPackageParams,
  UpdateAdminPackageResponse,
} from "@workspace/api-zod";
import { limitByIp, requireSameOrigin } from "../lib/security";
import { requireAdmin } from "../lib/adminAuth";
import {
  InvalidPackageError,
  PackageHasBuyersError,
  PackageNotFoundError,
  WhopRejectedError,
  createPackage,
  deletePackage,
  listAdminPackages,
  updatePackage,
} from "../lib/whopAdmin";

const router: IRouter = Router();
const limitWrites = limitByIp("admin-packages", 60_000, 30);

function fail(req: Request, res: Response, err: unknown): void {
  if (err instanceof InvalidPackageError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof PackageNotFoundError) {
    res.status(404).json({ error: "Package not found" });
  } else if (err instanceof PackageHasBuyersError) {
    res.status(409).json({ error: "This package has buyers, hide it instead" });
  } else if (err instanceof WhopRejectedError) {
    req.log.warn({ reason: err.message }, "Whop refused a package change");
    res.status(422).json({ error: `Whop: ${err.message}` });
  } else {
    req.log.error({ err }, "Package change on Whop failed");
    res.status(503).json({ error: "Payment provider unavailable" });
  }
}

router.get("/admin/packages", requireAdmin, async (req, res): Promise<void> => {
  try {
    res.json(ListAdminPackagesResponse.parse(await listAdminPackages()));
  } catch (err) {
    fail(req, res, err);
  }
});

router.post("/admin/packages", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const body = CreateAdminPackageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const created = await createPackage(body.data);
    req.log.info({ key: created.key }, "Admin put a new package on sale");
    res.status(201).json(CreateAdminPackageResponse.parse(created));
  } catch (err) {
    fail(req, res, err);
  }
});

router.put("/admin/packages/:key", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = UpdateAdminPackageParams.safeParse(req.params);
  const body = UpdateAdminPackageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const saved = await updatePackage(params.data.key, body.data);
    req.log.info({ key: saved.key }, "Admin changed a package");
    res.json(UpdateAdminPackageResponse.parse(saved));
  } catch (err) {
    fail(req, res, err);
  }
});

router.delete("/admin/packages/:key", requireSameOrigin, requireAdmin, limitWrites, async (req, res): Promise<void> => {
  const params = DeleteAdminPackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    await deletePackage(params.data.key);
    req.log.info({ key: params.data.key }, "Admin deleted a package");
    res.status(204).end();
  } catch (err) {
    fail(req, res, err);
  }
});

export default router;
