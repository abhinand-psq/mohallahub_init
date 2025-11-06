// src/controllers/analytics.controller.js

import Community from "../models/Community.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";

export const getOverviewStats = async (req, res, next) => {
  try {
    const [users, communities, posts, comments] = await Promise.all([
      User.countDocuments(),
      Community.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments()
    ]);
    res.json({
      success: true,
      data: {
        users, communities, posts, comments,
        generatedAt: new Date()
      }
    });
  } catch (err) {
    next(err);
  }
};
