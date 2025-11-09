// src/controllers/post.controller.js
import Post from "../models/Post.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import { uploadBuffer, thumbUrl } from "../services/cloudinary.service.js";

export const createPost = async (req, res, next) => {
  try {
    const { desc, communityId, rePostOf } = req.body;
    if (!communityId) return res.status(400).json({ success: false, error: { message: "communityId required" } });

    const community = await Community.findById(communityId);
    if (!community || community.isActive) return res.status(404).json({ success: false, error: { message: "Community not found" } });

    // Check membership unless public
    if (community.privacy !== "public") {
      const membership = await CommunityMembership.findOne({ user: req.user._id, community: communityId });
      if (!membership) return res.status(403).json({ success: false, error: { message: "Join community first" } });
    }

    // Media handling: up to 3 files
    const files = req.files?.media || [];
    if (files.length > 3) return res.status(400).json({ success: false, error: { message: "Up to 3 media files allowed" } });

    const media = [];
    for (const file of files) {
      const resCloud = await uploadBuffer(file.buffer, { folder: `communities/${communityId}`, resource_type: file.mimetype.startsWith("image") ? "image" : "video" });
      media.push({
        url: resCloud.secure_url,
        public_id: resCloud.public_id,
        kind: file.mimetype.startsWith("image") ? "image" : "video",
        width: resCloud.width,
        height: resCloud.height,
        duration: resCloud.duration
      });
    }

    const post = await Post.create({
      desc,
      media,
      user: req.user._id,
      community: communityId,
      rePostOf: rePostOf || null
    });

    // increment community postCount
    await Community.findByIdAndUpdate(communityId, { $inc: { postCount: 1 } });

    res.status(201).json({ success: true, data: { post } });
  } catch (err) {
    next(err);
  }
};

export const getCommunityPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    const filter = { community: id, isDeleted: false };
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "name username profilePic");
    res.json({ success: true, meta: { total, page, limit }, data: posts });
  } catch (err) {
    next(err);
  }
};

export const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate("user", "name username profilePic");
    if (!post) return res.status(404).json({ success: false, error: { message: "Not found" } });
    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, error: { message: "Not found" } });
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: { message: "Forbidden" } });
    }
    post.isDeleted = true;
    await post.save();
    await Community.findByIdAndUpdate(post.community, { $inc: { postCount: -1 } });
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (err) {
    next(err);
  }
};
