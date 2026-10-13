import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import checkoutRouter from "./checkout";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(checkoutRouter);

export default router;
