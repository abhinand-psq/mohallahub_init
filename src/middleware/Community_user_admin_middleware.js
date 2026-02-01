// src/middleware/Community_user_admin_middleware.js
import CommunityMembership from "../models/CommunityMembership.js";

export const community_user_AdminMiddleware = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { communityId } = req.params;

    const membership = await CommunityMembership.findOne({
      user: userId,
      community: communityId,
      status_in_community: "active"
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { message: "Not a community member" }
      });
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: { message: "Admin access required" }
      });
    }

    req.communityRole = membership.role;
    next();
  } catch (err) {
    return res.status(400).json({ success: false, error: { message: "Failed to verify community admin access" } });
  }
};
