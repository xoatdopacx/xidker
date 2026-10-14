import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import checkoutRouter from "./checkout";
import supportRouter from "./support";
import adminRouter from "./admin";
import adminPackagesRouter from "./adminPackages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(checkoutRouter);
router.use(supportRouter);
router.use(adminRouter);
router.use(adminPackagesRouter);

export default router;
