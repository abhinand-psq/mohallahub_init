//src/routes/community.admin.routes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { deletePost, removeMember } from "../controllers/admin/User_Admin/Admin.controller.js";
import { community_user_AdminMiddleware } from "../middleware/Community_user_admin_middleware.js";


const router = express.Router();

router.delete(
  "/:communityId/members/:userId",
  authMiddleware,
  community_user_AdminMiddleware,
  removeMember
);

router.delete(
  "/:communityId/posts/:postId",
  authMiddleware,
  community_user_AdminMiddleware,
  deletePost
);

export default router;
