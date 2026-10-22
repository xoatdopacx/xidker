import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import accountRouter from "./account";
import ordersRouter from "./orders";
import supportRouter from "./support";
import adminRouter from "./admin";
import adminStoreRouter from "./adminStore";
import adminPackagesRouter from "./adminPackages";
import samplesRouter from "./samples";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(accountRouter);
router.use(ordersRouter);
router.use(supportRouter);
router.use(adminRouter);
router.use(adminStoreRouter);
router.use(adminPackagesRouter);
router.use(samplesRouter);
router.use(storageRouter);

export default router;
