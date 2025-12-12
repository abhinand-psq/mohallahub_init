import Community from '../models/Community.js';
import CommunityMembership from '../models/CommunityMembership.js';
import User from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelpers.js';
import dotenv from 'dotenv';
dotenv.config();
// Create community
export const createCommunity = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      hierarchy,
      state, 
      district, 
      taluk, 
      block, 
      gramPanchayath, 
      wardNumber, 
      wardName,
      isPrivate 
    } = req.body;

    // Check if community already exists
    const existingCommunity = await Community.findOne({ name, hierarchy });
    if (existingCommunity) {
      return res.status(400).json({ error: 'Community already exists in this location' });
    }

    let icon = {};
    if (req.files?.icon?.[0]) {
      const result = await uploadToCloudinary(req.files.icon[0].buffer, 'community-icons');
      icon = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    let coverPic = {};
    if (req.files?.coverPic?.[0]) {
      const result = await uploadToCloudinary(req.files.coverPic[0].buffer, 'community-covers');
      coverPic = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    const community = new Community({
      name,
      description,
      icon,
      coverPic,
      createdBy: req.user._id,
      hierarchy,
      state,
      district,
      taluk,
      block,
      gramPanchayath,
      wardNumber,
      wardName,
      isPrivate,
      isActive: true
    });

    await community.save();

    // Create membership as owner
    const membership = new CommunityMembership({
      user: req.user._id,
      community: community._id,
      role: 'owner'
    });
    await membership.save();

    res.status(201).json({
      message: 'Community created successfully',
      community
    });
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({ error: 'Failed to create community' });
  }
};

// Get community details
export const getCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const community = await Community.findById(id)
      .populate('createdBy', 'username firstName lastName profilePic');

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const response = {
      community,
      isMember: false,
      role: null
    };

    if (userId) {
      const membership = await CommunityMembership.findOne({
        user: userId,
        community: id
      });
      
      if (membership) {
        response.isMember = true;
        response.role = membership.role;
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Get community error:', error);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
};

// Join community
export const joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Check if already a member
    const existingMembership = await CommunityMembership.findOne({
      user: req.user._id,
      community: id
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this community' });
    }

    // Check if community is private
    if (community.isPrivate && !existingMembership) {
      return res.status(403).json({ error: 'This community is private' });
    }

    const membership = new CommunityMembership({
      user: req.user._id,
      community: id,
      role: 'member'
    });
    await membership.save();

    // Update stats
    await Community.findByIdAndUpdate(id, { 
      $inc: { 'stats.membersCount': 1 } 
    });

    res.json({ message: 'Joined community successfully', membership });
  } catch (error) {
    console.error('Join community error:', error);
    res.status(500).json({ error: 'Failed to join community' });
  }
};

// Leave community
export const leaveCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const membership = await CommunityMembership.findOne({
      user: req.user._id,
      community: id
    });

    if (!membership) {
      return res.status(400).json({ error: 'Not a member of this community' });
    }

    if (membership.role === 'owner') {
      return res.status(403).json({ error: 'Owner cannot leave community' });
    }

    await CommunityMembership.findByIdAndDelete(membership._id);

    // Update stats
    await Community.findByIdAndUpdate(id, { 
      $inc: { 'stats.membersCount': -1 } 
    });

    res.json({ message: 'Left community successfully' });
  } catch (error) {
    console.error('Leave community error:', error);
    res.status(500).json({ error: 'Failed to leave community' });
  }
};

// Get community posts
export const getCommunityPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const posts = await Post.find({ 
      community: id, 
      isDeleted: false 
    })
      .populate('author', 'username firstName lastName profilePic')
      .populate('community', 'name icon')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ posts });
  } catch (error) {
    console.error('Get community posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// Search communities
export const searchCommunities = async (req, res) => {
  try {
    const { q, hierarchy } = req.query;

    const query = { isActive: true };
    
    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }

    if (hierarchy) {
      query.hierarchy = hierarchy;
    }

    const communities = await Community.find(query)
      .populate('createdBy', 'username')
      .limit(20);

    res.json({ communities });
  } catch (error) {
    console.error('Search communities error:', error);
    res.status(500).json({ error: 'Failed to search communities' });
  }
};



