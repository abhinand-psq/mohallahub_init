// src/controllers/post.controller.js
import Post from "../models/Post.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import User from '../models/User.js'
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
    const { content, description ,communityId, rePostOf,postType } = req.body;
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
      if (postType === "repost" && !rePostOf) {
  return res.status(400).json({
    success: false,
    error: { message: "rePostOf is required when postType is repost" }
  });
}
if (postType !== "repost" && rePostOf) {
  return res.status(400).json({
    success: false,
    error: { message: "rePostOf can only be used with repost type" }
  });
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
        description:description,
        postType:postType || undefined,
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
            description: originalPost.description
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
        postType:postType || undefined,
        duration: uploadRes.duration,
      });
    }

    const newPost = await Post.create({
      content,
      media,
      author: authUserId,
      community: communityId,
      description:description
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

const feed = async(req,res,next ) =>{
  try{
const userid = req?.user?._id;
// const isuserexit = await User.exists({_id:userid})
// const communites_from_user = await CommunityMembership.find({user:userid})
const [isuserexit,communities_from_user] = Promise.all([User.exists({_id:userid}),CommunityMembership.find({user:userid},{status_in_community})])
if(!isuserexit){
  return res.status(402).json({error:"user not found"})
}
const allpost = await Post.find({_id:{$in:communities_from_user}}).populate("community").
populate("users").populate("repostof")


  }catch(e){
   next(e)
  }
}

/*
// src/controllers/post.controller.js
import Post from "../models/Post.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import { uploadBuffer } from "../services/cloudinary.service.js";
import mongoose from "mongoose";

const MAX_MEDIA_FILES = 3;
const MAX_REPOST_DEPTH = 3;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

// Walk repost chain to compute depth. Returns true if depth would exceed MAX_REPOST_DEPTH.
const exceedsDepthLimit = async (originalPostId) => {
  let depth = 1;
  let currentId = originalPostId;

  while (currentId && depth < MAX_REPOST_DEPTH) {
    const doc = await Post.findById(currentId).select("rePostOf").lean();
    if (!doc) break;
    currentId = doc.rePostOf;
    depth++;
  }

  // If after walking up to MAX_REPOST_DEPTH we still have a parent, depth exceeded.
  if (!currentId) return false;
  // if currentId still has rePostOf, then chain length > MAX_REPOST_DEPTH
  const lastDoc = await Post.findById(currentId).select("rePostOf").lean();
  return !!(lastDoc && lastDoc.rePostOf);
};

// Create post (normal) or repost
export const createPost = async (req, res, next) => {
  try {
    const authUserId = req.user?._id;
    if (!authUserId) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });

    const { content, communityId, rePostOf } = req.body;

    if (!communityId) return res.status(400).json({ success: false, error: { message: "communityId required" } });
    if (!isValidId(communityId)) return res.status(400).json({ success: false, error: { message: "Invalid communityId" } });

    // check user not banned
    if (req.user.status === "banned") return res.status(403).json({ success: false, error: { message: "User banned" } });

    const community = await Community.findById(communityId).lean();
    if (!community || !community.isActive) return res.status(404).json({ success: false, error: { message: "Community not found or inactive" } });

    // membership check for private/restricted
    if (community.isPrivate && community.isPrivate !== "public") {
      const membership = await CommunityMembership.findOne({ user: authUserId, community: communityId }).lean();
      if (!membership) return res.status(403).json({ success: false, error: { message: "Join community to post" } });
    }

    // --- Repost flow ---
    if (rePostOf) {
      if (!isValidId(rePostOf)) return res.status(400).json({ success: false, error: { message: "Invalid rePostOf ID" } });

      // disallow media files on repost
      if (req.files?.media?.length) {
        return res.status(400).json({ success: false, error: { message: "Media uploads not allowed in reposts" } });
      }

      const originalPost = await Post.findById(rePostOf)
        .populate("author", "username firstName lastName profilePic")
        .populate("community", "name state district")
        .lean();

      if (!originalPost || originalPost.isDeleted) {
        return res.status(404).json({ success: false, error: { message: "Original post not found or deleted" } });
      }

      // depth check
      const tooDeep = await exceedsDepthLimit(originalPost._id);
      if (tooDeep) return res.status(400).json({ success: false, error: { message: `Repost depth limit (${MAX_REPOST_DEPTH}) exceeded` } });

      // create repost document (content can be empty)
      const repostDoc = await Post.create({
        content: (content || "").trim(),
        media: [],
        author: authUserId,
        community: communityId,
        rePostOf: originalPost._id,
      });

      // update counters: original repostsCount, and target community postsCount
      await Promise.all([
        Post.findByIdAndUpdate(originalPost._id, { $inc: { "stats.repostsCount": 1 } }),
        Community.findByIdAndUpdate(communityId, { $inc: { "stats.postsCount": 1 } })
      ]);

      // Return flattened response (Option A)
      // Note: originalPost already populated
      return res.status(201).json({
        success: true,
        data: {
          message: "Repost created",
          post: {
            _id: repostDoc._id,
            content: repostDoc.content,
            author: { id: authUserId }, // minimal author — client can use token to fetch profile; or you can populate if needed
            community: { id: communityId, name: community.name },
            rePostOf: {
              _id: originalPost._id,
              content: originalPost.content,
              media: originalPost.media || [],
              author: originalPost.author || null,
              community: originalPost.community || null,
              createdAt: originalPost.createdAt
            },
            createdAt: repostDoc.createdAt
          }
        }
      });
    }

    // --- Normal post flow ---
    // require content OR at least one media
    const files = req.files?.media || [];
    if ((!content || !String(content).trim()) && files.length === 0) {
      return res.status(400).json({ success: false, error: { message: "Post must have content or media" } });
    }

    if (files.length > MAX_MEDIA_FILES) {
      return res.status(400).json({ success: false, error: { message: `Maximum ${MAX_MEDIA_FILES} media files allowed` } });
    }

    // upload media to Cloudinary
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
        duration: uploadRes.duration || null,
        thumbnailUrl: uploadRes.thumbnail_url || undefined
      });
    }

    const newPost = await Post.create({
      content: (content || "").trim(),
      media,
      author: authUserId,
      community: communityId,
    });

    await Community.findByIdAndUpdate(communityId, { $inc: { "stats.postsCount": 1 } });

    return res.status(201).json({
      success: true,
      data: {
        message: "Post created",
        post: newPost
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get posts for a community (flattened parent)
export const getCommunityPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    if (!isValidId(id)) return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });

    const filter = { community: id, isDeleted: false };
    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username firstName lastName profilePic")
      .populate({
        path: "rePostOf",
        populate: { path: "author", select: "username firstName lastName profilePic" }
      })
      .lean();

    // If original post deleted -> mark reposts as deleted in DB (cascade) and remove original media in response
    const toMarkDeleted = [];
    for (const p of posts) {
      if (p.rePostOf && p.rePostOf.isDeleted) {
        // mark repost as deleted (persist)
        toMarkDeleted.push(p._id);
      }
    }
    if (toMarkDeleted.length) {
      // set isDeleted true for all reposts whose parent is deleted, and decrement their communities' stats
      const repostDocs = await Post.find({ _id: { $in: toMarkDeleted } }).select("_id community").lean();
      const communityDecrements = {};
      for (const r of repostDocs) {
        communityDecrements[r.community] = (communityDecrements[r.community] || 0) + 1;
      }
      // mark reposts deleted
      await Post.updateMany({ _id: { $in: toMarkDeleted } }, { $set: { isDeleted: true } });

      // decrement postsCount per community
      await Promise.all(Object.keys(communityDecrements).map(cid =>
        Community.findByIdAndUpdate(cid, { $inc: { "stats.postsCount": -communityDecrements[cid] } })
      ));
      // remove them from response (filtered out below)
    }

    // filter out newly-deleted reposts and prepare flattened parent placeholder for ones that remain
    const filtered = posts.filter(p => !(p.rePostOf && p.rePostOf.isDeleted));

    // For any remaining reposts whose parent is present but parent marked deleted earlier (edge cases), handling above should cover.
    // Prepare placeholder for any reposts whose parent might be deleted (should be filtered out)
    filtered.forEach((p) => {
      if (p.rePostOf && p.rePostOf.isDeleted) {
        p.rePostOf.content = "[Original post deleted]";
        p.rePostOf.media = [];
      }
    });

    res.json({
      success: true,
      meta: { total, page, limit },
      data: filtered
    });
  } catch (err) {
    next(err);
  }
};

// Get single post (flattened parent)
export const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, error: { message: "Invalid post ID" } });

    const post = await Post.findById(id)
      .populate("author", "username firstName lastName profilePic")
      .populate({
        path: "rePostOf",
        populate: { path: "author", select: "username firstName lastName profilePic" }
      })
      .lean();

    if (!post) return res.status(404).json({ success: false, error: { message: "Post not found" } });

    if (post.rePostOf && post.rePostOf.isDeleted) {
      // mark repost as deleted in DB and return a 410-like response
      await Post.findByIdAndUpdate(post._id, { $set: { isDeleted: true } });
      // decrement community stat for repost's community
      await Community.findByIdAndUpdate(post.community, { $inc: { "stats.postsCount": -1 } });

      return res.status(410).json({ success: false, error: { message: "Original post deleted — repost removed" } });
    }

    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
};

// Delete post (soft-delete) and cascade to reposts
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, error: { message: "Invalid post ID" } });

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, error: { message: "Post not found" } });

    // only author or admin can delete
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: { message: "Forbidden" } });
    }

    // soft delete the post
    post.isDeleted = true;
    await post.save();

    // decrement community postsCount for this post
    await Community.findByIdAndUpdate(post.community, { $inc: { "stats.postsCount": -1 } });

    // cascade: mark reposts of this post as deleted and decrement their community post counts
    const reposts = await Post.find({ rePostOf: post._id, isDeleted: false }).select("_id community").lean();
    if (reposts.length) {
      const communityDecrements = {};
      const repostIds = reposts.map(r => r._id);
      for (const r of reposts) {
        communityDecrements[r.community] = (communityDecrements[r.community] || 0) + 1;
      }

      // mark reposts deleted
      await Post.updateMany({ _id: { $in: repostIds } }, { $set: { isDeleted: true } });

      // decrement postsCount per community
      await Promise.all(Object.keys(communityDecrements).map(cid =>
        Community.findByIdAndUpdate(cid, { $inc: { "stats.postsCount": -communityDecrements[cid] } })
      ));
    }

    res.json({ success: true, data: { message: "Post deleted (soft) and reposts cascaded" } });
  } catch (err) {
    next(err);
  }
};

*/