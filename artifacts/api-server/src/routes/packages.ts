import { Router, type IRouter } from "express";
import { ListPackagesQueryParams, ListPackagesResponse } from "@workspace/api-zod";
import { publicPackage, visiblePackages } from "../lib/catalog";
import { hasVisibleSamples } from "../lib/samples";

const router: IRouter = Router();

router.get("/packages", async (req, res): Promise<void> => {
  const query = ListPackagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "lang must be a supported language code", reason: "invalid_input" });
    return;
  }
  const lang = query.data.lang ?? "vi";
  try {
    const [packages, samplesOn] = await Promise.all([visiblePackages(), hasVisibleSamples()]);
    res.json(ListPackagesResponse.parse(packages.map((row) => publicPackage(row, lang, samplesOn))));
  } catch (err) {
    req.log.error({ err }, "Failed to load packages");
    res.status(503).json({ error: "Packages are temporarily unavailable" });
  }
});

export default router;
