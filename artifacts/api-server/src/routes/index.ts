import { Router, type IRouter } from "express";
import healthRouter from "./health";
import umiRouter from "./umi";
import tutorRouter from "./tutor";
import adminRouter from "./admin";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/umi", umiRouter);
router.use("/tutor", tutorRouter);
router.use("/admin", adminRouter);
router.use("/feedback", feedbackRouter);

export default router;
