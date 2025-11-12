// src/controllers/community.controller.js
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import User from "../models/User.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";
import { uploadBuffer } from "../services/cloudinary.service.js";

export const createCommunity = async (req, res, next) => {
  try {
    const authUserId = req.user?._id;
    if (!authUserId) {
      return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    }

    const { name:communityname, description, privacy:isprivacy } = req.body;
    if ((!communityname || !communityname.trim()) && !description) {
      return res.status(400).json({ success: false, error: { message: "Community name or description is required" } });
    }

    const existname = await Community.findOne({ name: communityname.trim() });
    if (existname) {
      return res.status(409).json({ success: false, error: { message: "Community name already exists" } });
    }

    // load user (ensure not banned, has addressReference)
    const user = await User.findById(authUserId).lean();
    if (!user) return res.status(401).json({ success: false, error: { message: "User not found" } });
    if (user.status === "banned") {
      return res.status(403).json({ success: false, error: { message: "User is banned cant create a community" } });
    }
    if (!user.addressReference) {
      return res.status(400).json({ success: false, error: { message: "Add a valid address before creating a community" } });
    }

    // get UCA (single source of truth)
    const uca = await UserCommunityAccess.findById(user.addressReference).lean();
    if (!uca) {
      return res.status(400).json({ success: false, error: { message: "Address reference not found" } });
    }

    // Optional uploads
    let iconUrl = null;
    let iconId = null;
    let bannerUrl = null;
    let bannerId = null;

    if (req.files?.icon?.[0]) {
      const up = await uploadBuffer(req.files.icon[0].buffer, {
        folder: `communities/${communityname}`,
        resource_type: "image",
      });
      iconUrl = up.secure_url; iconId = up.public_id;
    }

    if (req.files?.banner?.[0]) {
      const up = await uploadBuffer(req.files.banner[0].buffer, {
        folder: `communities/${communityname}`,
        resource_type: "image",
      });
      bannerUrl = up.secure_url; bannerId = up.public_id;
    }

    // create community
    const community = await Community.create({
      name: communityname.trim(),
      description: description?.trim() || "",
      createdBy: authUserId,
      hierarchy: uca.hierarchy || undefined,
      state: uca.state,
      district: uca.district,
      ucaRef: uca._id,
      taluk: uca.taluk,
      block: uca.block,
      panchayath: uca.panchayath, // align snapshot key with your UCA field
      ward: uca.ward, // pick what you display in feeds
      isprivacy,
      icon:{
        url: iconUrl ? iconUrl : undefined,
        IconId: iconId ? iconId : undefined,
      },
      banner:{
        url: bannerUrl ? bannerUrl : undefined,
        BannerId: bannerId ? bannerId : undefined,
      },
      stats:{
        membersCount: 1,
        postsCount: 0
      },
      // if you store publicIds, add fields in model or keep them out:
      // iconPublicId: iconId,
      // bannerPublicId: bannerId,
    });

    // make creator the owner (idempotent thanks to unique (user,community) index)
    await CommunityMembership.create({
      user: authUserId,
      community: community._id,
      role: "owner",
    });

    return res.status(201).json({
      success: true,
      data: {
        name: community.name,
        hierarchy: community.hierarchy,
        privacy: community.privacy,
        icon: community.icon,
        createdAt: community.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ✅ List Communities
export const listCommunities = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, state, district, panchayath, ward, search } = req.query;
    const filter = { isActive: true };

    if (state) filter.state = state;
    if (district) filter.district = district;
    if (panchayath) filter.panchayath = panchayath;
    if (ward) filter.ward = ward;
    if (search) filter.name = { $regex: search, $options: "i" }; // partial name match

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, items] = await Promise.all([
      Community.countDocuments(filter),
      Community.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("name description state district panchayath ward icon banner stats membersCount createdAt")
        .lean()
    ]);

    return res.json({
      success: true,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
      data: items,
    });
  } catch (err) {
    next(err);
  }
};


// ✅ Join a Community
export const joinCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });

    const existing = await CommunityMembership.findOne({ user: req.user._id, community: id });
    if (existing)
      return res.status(400).json({ success: false, error: { message: "Already a member" } });

    const community = await Community.findById(id);
    if (!community)
      return res.status(404).json({ success: false, error: { message: "Community not found" } });
    if (!community.isActive)
      return res.status(403).json({ success: false, error: { message: "Community is inactive" } });

    await CommunityMembership.create({
      user: req.user._id,
      community: id,
      role: "member",
    });

    // update stats
    await Community.findByIdAndUpdate(id, { $inc: { "stats.membersCount": 1 } });

    return res.json({ success: true, data: { message: "Joined community successfully" } });
  } catch (err) {
    next(err);
  }
};


// ✅ Leave a Community
export const leaveCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });

    const membership = await CommunityMembership.findOneAndDelete({
      user: req.user._id,
      community: id,
    });

    if (!membership)
      return res.status(400).json({ success: false, error: { message: "Not a member of this community" } });

    await Community.findByIdAndUpdate(id, { $inc: { "stats.membersCount": -1 } });

    return res.json({ success: true, data: { message: "Left community successfully" } });
  } catch (err) {
    next(err);
  }
};


// ✅ Get a Single Community
export const getCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });

    const community = await Community.findById(id)
      .populate("createdBy", "username firstName lastName profilePic.url")
      .populate("ucaRef", "state district taluk block panchayath ward")
      .lean();

    if (!community)
      return res.status(404).json({ success: false, error: { message: "Community not found" } });

    const isMember = await CommunityMembership.exists({ user: req.user._id, community: id });

    return res.json({
      success: true,
      data: {
        ...community,
        membershipStatus: isMember ? "joined" : "not_joined",
      },
    });
  } catch (err) {
    next(err);
  }
};
