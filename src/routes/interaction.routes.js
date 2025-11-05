// src/routes/interaction.routes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as interactionController from "../controllers/interaction.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/like", interactionController.toggleLike);
router.post("/save", interactionController.toggleSavePost);
router.get("/saved", interactionController.getSavedPosts);

export default router;
