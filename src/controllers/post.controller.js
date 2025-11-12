// src/controllers/post.controller.js
import Post from "../models/Post.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import { uploadBuffer } from "../services/cloudinary.service.js";
import mongoose from "mongoose";
/**
 * @route
 * @access
 * @description
 * 
 */
// Utility constants
const MAX_MEDIA_FILES = 3;
const MAX_REPOST_DEPTH = 3;

export const createPost = async (req, res, next) => {
  try {
    const { content, communityId, rePostOf } = req.body;
    const authUserId = req.user?._id;

    if (!authUserId) {
      return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    }

    if (!communityId) {
      return res.status(400).json({ success: false, error: { message: "communityId required" } });
    }

    const community = await Community.findById(communityId);
    if (!community || !community.isActive) {
      return res.status(404).json({ success: false, error: { message: "Community not found or inactive" } });
    }

    // Check if user can post in this community
    if (community.isPrivate !== "public") {
      const membership = await CommunityMembership.findOne({ user: authUserId, community: communityId });
      if (!membership) {
        return res.status(403).json({ success: false, error: { message: "Join the community to post" } });
      }
    }

    // --- REPOST FLOW ---
    if (rePostOf) {
      // Validate repost target
      if (!mongoose.Types.ObjectId.isValid(rePostOf)) {
        return res.status(400).json({ success: false, error: { message: "Invalid rePostOf ID" } });
      }

      const originalPost = await Post.findById(rePostOf)
        .populate("author", "username firstName profilePic")
        .populate("community", "name state district");

      if (!originalPost || originalPost.isDeleted) {
        return res.status(404).json({ success: false, error: { message: "Original post not found or deleted" } });
      }

      // Depth check
      let depth = 1;
      let current = originalPost;
      while (current.rePostOf && depth < MAX_REPOST_DEPTH) {
        current = await Post.findById(current.rePostOf).select("rePostOf");
        if (!current) break;
        depth++;
      }

      if (depth >= MAX_REPOST_DEPTH && current.rePostOf) {
        return res.status(400).json({ success: false, error: { message: "Repost depth limit exceeded" } });
      }

      // No media allowed in repost
      if (req.files?.media?.length) {
        return res.status(400).json({ success: false, error: { message: "Media uploads not allowed in reposts" } });
      }

      // Create repost
      const repost = await Post.create({
        content: content || "",
        community: communityId,
        author: authUserId,
        rePostOf,
        isDeleted: false,
      });

      await Promise.all([
        Post.findByIdAndUpdate(rePostOf, { $inc: { "stats.repostsCount": 1 } }),
        Community.findByIdAndUpdate(communityId, { $inc: { "stats.postsCount": 1 } })
      ]);

      return res.status(201).json({
        success: true,
        data: {
          message: "Repost created successfully",
          repostId: repost._id,
          originalPost: {
            id: originalPost._id,
            author: originalPost.author,
            community: originalPost.community,
            content: originalPost.content,
            media: originalPost.media,
          },
        },
      });
    }

    // --- NORMAL POST FLOW ---
    if (!content && (!req.files?.media || req.files.media.length === 0)) {
      return res.status(400).json({ success: false, error: { message: "Post must have content or media" } });
    }

    const files = req.files?.media || [];
    if (files.length > MAX_MEDIA_FILES) {
      return res.status(400).json({ success: false, error: { message: `Maximum ${MAX_MEDIA_FILES} media files allowed` } });
    }

    const media = [];
    for (const file of files) {
      const uploadRes = await uploadBuffer(file.buffer, {
        folder: `posts/${communityId}`,
        resource_type: file.mimetype.startsWith("image") ? "image" : "video",
      });

      media.push({
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        type: file.mimetype.startsWith("image") ? "image" : "video",
        width: uploadRes.width,
        height: uploadRes.height,
        duration: uploadRes.duration,
      });
    }

    const newPost = await Post.create({
      content,
      media,
      author: authUserId,
      community: communityId,
    });

    await Community.findByIdAndUpdate(communityId, { $inc: { "stats.postsCount": 1 } });

    return res.status(201).json({
      success: true,
      data: {
        message: "Post created successfully",
        post: newPost,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------
// Fetch all posts for a community
// ------------------------------
export const getCommunityPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    const filter = { community: id, isDeleted: false };
    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username firstName profilePic.url")
      .populate({
        path: "rePostOf",
        populate: { path: "author", select: "username firstName profilePic.url" },
      })
      .lean();

    // Handle deleted original posts in reposts
    posts.forEach((p) => {
      if (p.rePostOf && p.rePostOf.isDeleted) {
        p.rePostOf.content = "[Original post deleted]";
        p.rePostOf.media = [];
      }
    });

    res.json({
      success: true,
      meta: { total, page, limit },
      data: posts,
    });
  } catch (err) {
    next(err);
  }
};

// ------------------------------
// Get a single post (with repost info)
// ------------------------------
export const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate("author", "username firstName profilePic.url")
      .populate({
        path: "rePostOf",
        populate: { path: "author", select: "username firstName profilePic.url" },
      })
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, error: { message: "Post not found" } });
    }

    // Replace deleted original post with placeholder
    if (post.rePostOf && post.rePostOf.isDeleted) {
      post.rePostOf.content = "[Original post deleted]";
      post.rePostOf.media = [];
    }

    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
};

// ------------------------------
// Delete a post (soft delete)
// ------------------------------
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, error: { message: "Post not found" } });
    }

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: { message: "Unauthorized" } });
    }

    post.isDeleted = true;
    await post.save();

    await Community.findByIdAndUpdate(post.community, { $inc: { "stats.postsCount": -1 } });

    res.json({ success: true, data: { message: "Post deleted successfully" } });
  } catch (err) {
    next(err);
  }
};
