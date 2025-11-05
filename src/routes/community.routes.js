// src/routes/community.routes.js
import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as communityController from "../controllers/community.controller.js";

const router = express.Router();

router.post("/create", authMiddleware, [ body("name").isLength({ min: 3 }) ], validateRequest, communityController.createCommunity);
router.get("/", authMiddleware, communityController.listCommunities);
router.get("/:id", authMiddleware, communityController.getCommunity);
router.post("/:id/join", authMiddleware, communityController.joinCommunity);
router.delete("/:id/leave", authMiddleware, communityController.leaveCommunity);

export default router;
