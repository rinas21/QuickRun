import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ordersRouter from "./orders";
import offersRouter from "./offers";
import deliveriesRouter from "./deliveries";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ordersRouter);
router.use(offersRouter);
router.use(deliveriesRouter);
router.use(usersRouter);
router.use(dashboardRouter);

export default router;
