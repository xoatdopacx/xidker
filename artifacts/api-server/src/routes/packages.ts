import { Router, type IRouter } from "express";
import { ListPackagesQueryParams, ListPackagesResponse } from "@workspace/api-zod";
import { listPackages } from "../lib/whopStore";
import { hasVisibleSamples } from "../lib/samples";

const router: IRouter = Router();

router.get("/packages", async (req, res): Promise<void> => {
  const query = ListPackagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "lang must be a supported language code" });
    return;
  }

  try {
    const [packages, samplesOn] = await Promise.all([
      listPackages(query.data.lang ?? "vi"),
      // The catalog stays up without the database; a package then just skips the sample choice.
      hasVisibleSamples().catch((err: unknown) => {
        req.log.error({ err }, "Could not check for source samples");
        return false;
      }),
    ]);
    // With no sample on show there is nothing to pick, so the package is bought as usual.
    res.json(ListPackagesResponse.parse(packages.map((p) => (p.pickSample && !samplesOn ? { ...p, pickSample: false } : p))));
  } catch (err) {
    req.log.error({ err }, "Failed to load packages from Whop");
    res.status(503).json({ error: "Packages are temporarily unavailable" });
  }
});

export default router;
