// src/routes/comment.routes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as commentController from "../controllers/comment.controller.js";

const router = express.Router();

router.post("/", authMiddleware, commentController.addComment);
router.get("/post/:postId", authMiddleware, commentController.getCommentsForPost);
router.delete("/:id", authMiddleware, commentController.deleteComment);

export default router;
