// src/routes/post.routes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import * as postController from "../controllers/post.controller.js";

const router = express.Router();

router.post("/create", authMiddleware, upload.fields([{ name: "media", maxCount: 3 }]), postController.createPost);
router.get("/community/:id", authMiddleware, postController.getCommunityPosts);
router.get("/:id", authMiddleware, postController.getPost);
router.delete("/:id", authMiddleware, postController.deletePost);

export default router;
