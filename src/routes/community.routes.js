// src/routes/community.routes.js
import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as communityController from "../controllers/community.controller.js";
import { upload } from "../middleware/uploadMiddleware.js";

// ! ⚙️ Optional (Highly Recommended)

/*Add GET /my route
→ to list all communities that the authenticated user joined (for the user dashboard).

router.get("/my", authMiddleware, communityController.listUserCommunities);


Add PUT /:id/update
→ for community owners/admins to edit details (name, description, privacy, etc.)

Add DELETE /:id
→ for soft deleting (set isActive: false).*/


const router = express.Router();

function sample(req,res,next){
  console.log("its comes here");
}

router.post("/create", authMiddleware, validateRequest,upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),communityController.createCommunity);
router.get("/my", authMiddleware, communityController.getMyCommunities);
router.get("/available", authMiddleware, communityController.getAvailableCommunities);
router.get("/get/min", authMiddleware, communityController.getMyCommunitiesSimple);

// ✅ THEN GENERIC ROUTES
router.get("/", authMiddleware, communityController.listCommunities);
router.get("/:id", authMiddleware, communityController.getCommunity);
router.post("/:id/join", authMiddleware, communityController.joinCommunity);
router.delete("/:id/leave", authMiddleware, communityController.leaveCommunity);
export default router;
