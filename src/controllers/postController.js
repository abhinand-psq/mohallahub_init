import Post from '../models/Post.js';
import Community from '../models/Community.js';
import CommunityMembership from '../models/CommunityMembership.js';
import Like from '../models/Like.js';
import SavedPost from '../models/SavedPost.js';
import Comment from '../models/Comment.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelpers.js';

// Create post
export const createPost = async (req, res) => {
  try {
    const { content, community: communityId, rePostOf } = req.body;

    // Check if user is member of community
    const membership = await CommunityMembership.findOne({
      user: req.user._id,
      community: communityId
    });

    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to post in this community' });
    }

    const media = [];
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'posts');
        media.push({
          type: result.resource_type === 'video' ? 'video' : 'image',
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          duration: result.duration,
          thumbnailUrl: result.secure_url // Can be enhanced to generate actual thumbnails
        });
      }
    }

    const post = new Post({
      content,
      media,
      author: req.user._id,
      community: communityId,
      rePostOf: rePostOf || null,
      isSensitive: req.body.isSensitive === 'true'
    });

    await post.save();

    // Update stats
    await Community.findByIdAndUpdate(communityId, { 
      $inc: { 'stats.postsCount': 1 } 
    });

    res.status(201).json({
      message: 'Post created successfully',
      post: await Post.findById(post._id).populate('author', 'username firstName lastName profilePic')
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Get post by ID
export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const post = await Post.findById(id)
      .populate('author', 'username firstName lastName profilePic')
      .populate('community', 'name icon')
      .populate('rePostOf');

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const response = { post };
    
    if (userId) {
      const [isLiked, isSaved] = await Promise.all([
        Like.findOne({ user: userId, post: id }),
        SavedPost.findOne({ user: userId, post: id })
      ]);
      response.isLiked = !!isLiked;
      response.isSaved = !!isSaved;
    }

    res.json(response);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Get feed (posts from communities user is member of)
export const getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get communities user is member of
    const memberships = await CommunityMembership.find({ user: req.user._id });
    const communityIds = memberships.map(m => m.community);

    const posts = await Post.find({
      community: { $in: communityIds },
      isDeleted: false
    })
      .populate('author', 'username firstName lastName profilePic')
      .populate('community', 'name icon')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ posts });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
};

// Like post
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;

    const existingLike = await Like.findOne({
      user: req.user._id,
      post: id
    });

    if (existingLike) {
      return res.status(400).json({ error: 'Already liked this post' });
    }

    const like = new Like({
      user: req.user._id,
      post: id
    });
    await like.save();

    // Update post stats
    await Post.findByIdAndUpdate(id, { 
      $inc: { 'stats.likesCount': 1 } 
    });

    res.json({ message: 'Post liked successfully', like });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
};

// Unlike post
export const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;

    await Like.findOneAndDelete({
      user: req.user._id,
      post: id
    });

    // Update post stats
    await Post.findByIdAndUpdate(id, { 
      $inc: { 'stats.likesCount': -1 } 
    });

    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
};

// Save post
export const savePost = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSave = await SavedPost.findOne({
      user: req.user._id,
      post: id
    });

    if (existingSave) {
      return res.status(400).json({ error: 'Already saved this post' });
    }

    const savedPost = new SavedPost({
      user: req.user._id,
      post: id
    });
    await savedPost.save();

    res.json({ message: 'Post saved successfully', savedPost });
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
};

// Unsave post
export const unsavePost = async (req, res) => {
  try {
    const { id } = req.params;

    await SavedPost.findOneAndDelete({
      user: req.user._id,
      post: id
    });

    res.json({ message: 'Post unsaved successfully' });
  } catch (error) {
    console.error('Unsave post error:', error);
    res.status(500).json({ error: 'Failed to unsave post' });
  }
};

// Delete post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    post.isDeleted = true;
    await post.save();

    // Update community stats
    await Community.findByIdAndUpdate(post.community, { 
      $inc: { 'stats.postsCount': -1 } 
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};


