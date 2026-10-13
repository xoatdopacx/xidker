import { Router, type IRouter } from "express";
import { ListPackagesQueryParams, ListPackagesResponse } from "@workspace/api-zod";
import { listPackages } from "../lib/whopStore";

const router: IRouter = Router();

router.get("/packages", async (req, res): Promise<void> => {
  const query = ListPackagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "lang must be one of: vi, en" });
    return;
  }

  try {
    const packages = await listPackages(query.data.lang ?? "vi");
    res.json(ListPackagesResponse.parse(packages));
  } catch (err) {
    req.log.error({ err }, "Failed to load packages from Whop");
    res.status(503).json({ error: "Packages are temporarily unavailable" });
  }
});

export default router;
