import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getUserFeed } from "../controllers/feed.controller.js";

const router = express.Router();

router.get("/feed", authMiddleware, getUserFeed);

export default router;
