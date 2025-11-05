// src/routes/notification.routes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as notificationController from "../controllers/notification.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.put("/:id/read", notificationController.markAsRead);
router.put("/read-all", notificationController.markAllRead);

export default router;
