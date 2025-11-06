import express from "express";
import adminAuth from "../middleware/adminMiddleware.js";
import { getOverviewStats } from "../controllers/analytics.controller.js";

const router = express.Router();
router.get("/overview", adminAuth, getOverviewStats);
export default router;
