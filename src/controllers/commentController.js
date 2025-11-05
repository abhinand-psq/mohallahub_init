import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import Like from '../models/Like.js';
import { uploadToCloudinary } from '../utils/cloudinaryHelpers.js';

// Create comment
export const createComment = async (req, res) => {
  try {
    const { id } = req.params; // post id
    const { content, parentComment } = req.body;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const media = [];
    
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'comments');
      media.push({
        type: result.resource_type === 'video' ? 'video' : 'image',
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      });
    }

    const comment = new Comment({
      content,
      media,
      author: req.user._id,
      post: id,
      parentComment: parentComment || null
    });

    await comment.save();

    // Update post stats
    await Post.findByIdAndUpdate(id, { 
      $inc: { 'stats.commentsCount': 1 } 
    });

    res.status(201).json({
      message: 'Comment created successfully',
      comment: await Comment.findById(comment._id).populate('author', 'username firstName lastName profilePic')
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// Get comments for a post
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.find({ 
      post: id, 
      isDeleted: false,
      parentComment: null // Top-level comments only
    })
      .populate('author', 'username firstName lastName profilePic')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get replies for each comment
    for (const comment of comments) {
      const replies = await Comment.find({ parentComment: comment._id, isDeleted: false })
        .populate('author', 'username firstName lastName profilePic')
        .limit(5);
      comment.replies = replies;
    }

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// Like comment
export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;

    const existingLike = await Like.findOne({
      user: req.user._id,
      comment: id
    });

    if (existingLike) {
      return res.status(400).json({ error: 'Already liked this comment' });
    }

    const like = new Like({
      user: req.user._id,
      comment: id
    });
    await like.save();

    await Comment.findByIdAndUpdate(id, { 
      $inc: { 'stats.likesCount': 1 } 
    });

    res.json({ message: 'Comment liked successfully', like });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
};

// Unlike comment
export const unlikeComment = async (req, res) => {
  try {
    const { id } = req.params;

    await Like.findOneAndDelete({
      user: req.user._id,
      comment: id
    });

    await Comment.findByIdAndUpdate(id, { 
      $inc: { 'stats.likesCount': -1 } 
    });

    res.json({ message: 'Comment unliked successfully' });
  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    comment.isDeleted = true;
    await comment.save();

    // Update post stats
    await Post.findByIdAndUpdate(comment.post, { 
      $inc: { 'stats.commentsCount': -1 } 
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};


