import express from "express";
import { getOverviewStats } from "../controllers/analytics.controller.js";

const router = express.Router();
router.get("/overview", getOverviewStats);
export default router;
