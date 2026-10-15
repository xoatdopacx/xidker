import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import checkoutRouter from "./checkout";
import supportRouter from "./support";
import adminRouter from "./admin";
import adminPackagesRouter from "./adminPackages";
import adminOrdersRouter from "./adminOrders";
import samplesRouter from "./samples";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(checkoutRouter);
router.use(supportRouter);
router.use(adminRouter);
router.use(adminPackagesRouter);
router.use(adminOrdersRouter);
router.use(samplesRouter);
router.use(storageRouter);

export default router;
