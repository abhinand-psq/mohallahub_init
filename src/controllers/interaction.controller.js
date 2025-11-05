// src/controllers/interaction.controller.js
import Like from "../models/Like.js";
import SavedPost from "../models/SavedPost.js";
import Post from "../models/Post.js";

/**
 * Toggle like on a post or comment
 * Body: { postId } OR { commentId }
 */
export const toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { postId, commentId } = req.body;
    if (!postId && !commentId) {
      return res.status(400).json({ success: false, error: { message: "postId or commentId required" } });
    }

    try {
      const like = await Like.create({ user: userId, post: postId || undefined, comment: commentId || undefined });
      // Optional: create notification here
      return res.json({ success: true, data: { action: "liked", likeId: like._id } });
    } catch (err) {
      if (err.code === 11000) {
        // already liked -> unlike
        const filter = postId ? { user: userId, post: postId } : { user: userId, comment: commentId };
        await Like.deleteOne(filter);
        return res.json({ success: true, data: { action: "unliked" } });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle save/unsave post
 * Body: { postId }
 */
export const toggleSavePost = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ success: false, error: { message: "postId required" } });

    try {
      const sp = await SavedPost.create({ user: userId, post: postId });
      return res.json({ success: true, data: { action: "saved", id: sp._id } });
    } catch (err) {
      if (err.code === 11000) {
        await SavedPost.deleteOne({ user: userId, post: postId });
        return res.json({ success: true, data: { action: "unsaved" } });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Get saved posts for current user
 */
export const getSavedPosts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const items = await SavedPost.find({ user: userId }).populate({
      path: "post",
      populate: { path: "user", select: "name username profilePic" }
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};
