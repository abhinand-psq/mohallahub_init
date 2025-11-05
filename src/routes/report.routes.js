// src/routes/report.routes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as reportController from "../controllers/report.controller.js";

const router = express.Router();

router.post("/", authMiddleware, reportController.createReport);

export default router;
