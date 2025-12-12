// src/controllers/user.controller.js
import User from "../models/User.js";
import CommunityMembership from "../models/CommunityMembership.js";
import dotenv from 'dotenv';
dotenv.config();
export const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-passwordHash").populate("communityAccess");
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });

    // counts (simple)
    const postsCount = 0; // implement later: Post.countDocuments({ user: user._id })
    const followingCount = 0;
    const followerCount = 0;

    res.json({ success: true, data: { user, stats: { postsCount, followingCount, followerCount } } });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() !== id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: { message: "Forbidden" } });
    }

    const updates = {};
    const allowed = ["name", "displayName", "bio"];
    allowed.forEach(k => { if (req.body[k]) updates[k] = req.body[k]; });

    // images: handle via files if passed
    if (req.files?.profilePic?.[0]) {
      // upload handled by auth flow / cloudinary service in future
      updates.profilePic = "TODO";
    }
    if (req.files?.coverPic?.[0]) {
      updates.coverPic = "TODO";
    }
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-passwordHash");
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// follow/unfollow
import Follow from "../models/Follow.js";
export const toggleFollow = async (req, res, next) => {
  try {
    const { id } = req.params; // id to follow
    if (req.user._id.toString() === id) return res.status(400).json({ success: false, error: { message: "Cannot follow self" } });

    try {
      const doc = await Follow.create({ follower: req.user._id, following: id });
      return res.json({ success: true, data: { action: "followed" } });
    } catch (err) {
      // duplicate -> unfollow
      if (err.code === 11000) {
        await Follow.deleteOne({ follower: req.user._id, following: id });
        return res.json({ success: true, data: { action: "unfollowed" } });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};
