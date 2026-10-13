import { Router, type IRouter } from "express";
import healthRouter from "./health";
import packagesRouter from "./packages";
import checkoutRouter from "./checkout";
import chatRouter from "./chat";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packagesRouter);
router.use(checkoutRouter);
router.use(chatRouter);
router.use(adminRouter);

export default router;
