// src/controllers/comment.controller.js
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";

export const addComment = async (req, res, next) => {
  try {
    const { postId, text, parentComment } = req.body;
    if (!postId || !text) return res.status(400).json({ success: false, error: { message: "Required fields missing" } });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, error: { message: "Post not found" } });

    const comment = await Comment.create({
      post: postId,
      user: req.user._id,
      text,
      parentComment: parentComment || null
    });

    // notify post owner (basic)
    if (post.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        type: "comment",
        entityRef: post._id,
        entityType: "Post",
        message: `${req.user.username || req.user.name} commented on your post`
      });
    }

    res.status(201).json({ success: true, data: { comment } });
  } catch (err) {
    next(err);
  }
};

export const getCommentsForPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "30", 10), 100);
    const skip = (page - 1) * limit;

    const filter = { post: postId, isDeleted: false, parentComment: null };
    const total = await Comment.countDocuments(filter);
    const comments = await Comment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate("user", "name username profilePic");
    res.json({ success: true, meta: { total, page, limit }, data: comments });
  } catch (err) {
    next(err);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ success: false, error: { message: "Not found" } });
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: { message: "Forbidden" } });
    }
    comment.isDeleted = true;
    await comment.save();
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (err) {
    next(err);
  }
};
