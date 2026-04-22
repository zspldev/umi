import { Router, type IRouter } from "express";
import healthRouter from "./health";
import umiRouter from "./umi";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/umi", umiRouter);

export default router;
