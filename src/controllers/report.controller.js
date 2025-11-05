// src/controllers/report.controller.js
import Report from "../models/Report.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";

export const createReport = async (req, res, next) => {
  try {
    const { targetUser, targetPost, targetComment, reason, details } = req.body;
    if (!targetUser && !targetPost && !targetComment) {
      return res.status(400).json({ success: false, error: { message: "At least one target required" } });
    }
    if (!reason) return res.status(400).json({ success: false, error: { message: "Reason required" } });

    // optional: validate target existence (lightweight)
    if (targetPost) {
      const p = await Post.findById(targetPost);
      if (!p) return res.status(404).json({ success: false, error: { message: "Target post not found" } });
    }
    if (targetComment) {
      const c = await Comment.findById(targetComment);
      if (!c) return res.status(404).json({ success: false, error: { message: "Target comment not found" } });
    }
    if (targetUser) {
      const u = await User.findById(targetUser);
      if (!u) return res.status(404).json({ success: false, error: { message: "Target user not found" } });
    }

    const report = await Report.create({
      reportedBy: req.user._id,
      targetUser: targetUser || undefined,
      targetPost: targetPost || undefined,
      targetComment: targetComment || undefined,
      reason, details
    });

    res.status(201).json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
};
