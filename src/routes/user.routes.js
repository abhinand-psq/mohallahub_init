// src/routes/user.routes.js
import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as userController from "../controllers/user.controller.js";

const router = express.Router();

router.get("/:id", authMiddleware, userController.getProfile);
router.put("/:id", authMiddleware, userController.updateProfile);
router.post("/:id/follow", authMiddleware, userController.toggleFollow);

export default router;
