// src/routes/post.routes.js
import express from "express";
import { body, param } from "express-validator";
import { authMiddleware } from "../middleware/authMiddleware.js";
import validateRequest from "../middleware/validateRequest.js";
import { upload } from "../middleware/uploadMiddleware.js";
import * as postController from "../controllers/post.controller.js";

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  upload.fields([{ name: "media", maxCount: 3 }]),
  [
    body("content").optional().isString().trim(),
    body("communityId").notEmpty().withMessage("Community ID is required"),
    body("content").optional().isString().trim(),
    body("rePostOf").optional().isMongoId().withMessage("Invalid repost ID format"),
  ],
  validateRequest,
  postController.createPost
);


router.get(
  "/community/:id",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid community ID")],
  validateRequest,
  postController.getCommunityPosts
);


router.get(
  "/:id",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid post ID")],
  validateRequest,
  postController.getPost
);


router.delete(
  "/:id",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid post ID")],
  validateRequest,
  postController.deletePost
);

export default router;
