import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Post from '../models/Post.js';
import Community from '../models/Community.js';
import CommunityMembership from '../models/CommunityMembership.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelpers.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?._id;

    const user = await User.findOne({ username })
      .populate('addressReference')
      .select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response = {
      user,
      following: false,
      isOwnProfile: false
    };

    if (currentUserId) {
      const followRelation = await Follow.findOne({
        follower: currentUserId,
        following: user._id
      });
      response.following = !!followRelation;
      response.isOwnProfile = currentUserId.toString() === user._id.toString();
    }

    res.json(response);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;

    // Handle profile picture update
    if (req.file) {
      if (user.profilePic?.publicId) {
        await deleteFromCloudinary(user.profilePic.publicId);
      }
      const result = await uploadToCloudinary(req.file.buffer, 'profiles');
      user.profilePic = {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        profilePic: user.profilePic,
        coverPic: user.coverPic
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Follow user
export const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;

    if (userId === followerId.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existingFollow = await Follow.findOne({ 
      follower: followerId, 
      following: userId 
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const follow = new Follow({
      follower: followerId,
      following: userId
    });
    await follow.save();

    // Update stats
    await User.findByIdAndUpdate(followerId, { 
      $inc: { 'stats.followingCount': 1 } 
    });
    await User.findByIdAndUpdate(userId, { 
      $inc: { 'stats.followersCount': 1 } 
    });

    res.json({ message: 'Followed successfully', follow });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

// Unfollow user
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;

    await Follow.findOneAndDelete({ 
      follower: followerId, 
      following: userId 
    });

    // Update stats
    await User.findByIdAndUpdate(followerId, { 
      $inc: { 'stats.followingCount': -1 } 
    });
    await User.findByIdAndUpdate(userId, { 
      $inc: { 'stats.followersCount': -1 } 
    });

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};

// Get user's posts
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const posts = await Post.find({ 
      author: user._id, 
      isDeleted: false 
    })
      .populate('author', 'username firstName lastName profilePic')
      .populate('community', 'name icon')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } }
      ],
      isActive: true
    })
      .select('username firstName lastName profilePic stats')
      .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};



