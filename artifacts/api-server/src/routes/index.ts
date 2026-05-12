import { Router, type IRouter } from "express";
import healthRouter from "./health";
import umiRouter from "./umi";
import tutorRouter from "./tutor";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/umi", umiRouter);
router.use("/tutor", tutorRouter);

export default router;
