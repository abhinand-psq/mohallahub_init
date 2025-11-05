// src/controllers/community.controller.js
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import User from "../models/User.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";

export const createCommunity = async (req, res, next) => {
  try {
    const { name, description, privacy } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { message: "Name required" } });

    // user must have UCA
    const user = await User.findById(req.user._id).populate("communityAccess");
    if (!user.communityAccess) return res.status(400).json({ success: false, error: { message: "Add address first" } });

    const uca = await UserCommunityAccess.findById(user.communityAccess._id);
    if (!uca) return res.status(400).json({ success: false, error: { message: "Invalid user community access" } });

    const community = await Community.create({
      name,
      description,
      createdBy: user._id,
      hierarchy: uca._id,
      state: uca.state,
      district: uca.district,
      taluk: uca.taluk,
      block: uca.block,
      panchayath: uca.panchayath,
      ward: uca.ward,
      privacy: privacy || "public"
    });

    // add creator as owner
    await CommunityMembership.create({ user: user._id, community: community._id, role: "owner" });
    await Community.findByIdAndUpdate(community._id, { $inc: { memberCount: 1 } });

    res.status(201).json({ success: true, data: { community } });
  } catch (err) {
    // handle duplicate name per hierarchy
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: { message: "Community name already exists in this area" } });
    }
    next(err);
  }
};

export const listCommunities = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, state, district, panchayath, ward } = req.query;
    const filter = { isDeleted: false };
    if (state) filter.state = state;
    if (district) filter.district = district;
    if (panchayath) filter.panchayath = panchayath;
    if (ward) filter.ward = ward;

    const skip = (page - 1) * limit;
    const total = await Community.countDocuments(filter);
    const items = await Community.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
    res.json({ success: true, meta: { total, page: parseInt(page), limit: parseInt(limit) }, data: items });
  } catch (err) {
    next(err);
  }
};

export const joinCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await CommunityMembership.findOne({ user: req.user._id, community: id });
    if (exists) return res.status(400).json({ success: false, error: { message: "Already a member" } });
    await CommunityMembership.create({ user: req.user._id, community: id, role: "member" });
    await Community.findByIdAndUpdate(id, { $inc: { memberCount: 1 } });
    res.json({ success: true, data: { message: "Joined" } });
  } catch (err) {
    next(err);
  }
};

export const leaveCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    await CommunityMembership.deleteOne({ user: req.user._id, community: id });
    await Community.findByIdAndUpdate(id, { $inc: { memberCount: -1 } });
    res.json({ success: true, data: { message: "Left community" } });
  } catch (err) {
    next(err);
  }
};

export const getCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const community = await Community.findById(id).populate("createdBy", "name username profilePic");
    if (!community) return res.status(404).json({ success: false, error: { message: "Not found" } });
    const memberCount = await CommunityMembership.countDocuments({ community: id });
    res.json({ success: true, data: { community, memberCount } });
  } catch (err) {
    next(err);
  }
};
