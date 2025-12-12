// src/controllers/community.controller.js
import mongoose from "mongoose";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import User from "../models/User.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";
import { uploadBuffer } from "../services/cloudinary.service.js";
import dotenv from 'dotenv';
dotenv.config();

import dotenv from 'dotenv'

dotenv.config()
export const createCommunity = async (req, res, next) => {
  try {
    console.log(req.body);
    
    const authUserId = req.user?._id;
    if (!authUserId) {
      return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    }

    const { name:communityname, description,isPrivate ,allowedMarketplaceCategories } = req.body;
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
    console.log(uca);
    
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
    console.log("its work here fuck you");

    const community = await Community.create({
      name: communityname.trim(),
      description: description?.trim() || "",
      createdBy: authUserId,
       hierarchy: [uca.state, uca.district, uca.taluk, uca.block, uca.panchayath, uca.ward].filter(Boolean).join("-"),
      state: uca.state,
      district: uca.district,
      ucaRef: uca._id,
      taluk: uca.taluk,
      block: uca.block,
      isDefault:false,
      panchayath: uca.panchayath, // align snapshot key with your UCA field
      ward: uca.ward, // pick what you display in feeds
      isPrivate:isPrivate,
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
      allowedMarketplaceCategories:allowedMarketplaceCategories || [],
      // if you store publicIds, add fields in model or keep them out:
      // iconPublicId: iconId,
      // bannerPublicId: bannerId,
    });
console.log(community );

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
 console.log(filter);
 

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
  console.log("oops");
  
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
    console.log(id)
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
    console.log("sddsfbisdfb");
    console.log(err);

    next(err);
  }
};



export const getMyCommunities = async (req, res, next) => {
  try {
    // User is already attached by cookie-based auth middleware
    const userId = req.user._id;

    const memberships = await CommunityMembership.find({
      user: userId,
      status_in_community: "active",
    })
      .populate({
        path: "community",
        select: "name description ucaref icon banner isPrivate createdBy",
      })
      .sort({ createdAt: -1 });

    const communities = memberships
      .filter(m => m.community) // safety check
      .map(m => ({
        _id: m.community._id,
        name: m.community.name,
        description: m.community.description,
        ucaref: m.community.ucaref,
        icon: m.community.icon,
        banner: m.community.banner,
        isPrivate: m.community.isPrivate,
        createdBy: m.community.createdBy,
        joinedAt: m.createdAt,
        roleInCommunity: m.role_in_community || "member"
      }));

    res.json({
      success: true,
      data: communities,
      total: communities.length
    });
  } catch (error) {
    next(error);
  }
};



export const getAvailableCommunities = async (req, res, next) => {
  console.log("hello")
  try {
    const user = req.user;

    if (!user.addressReference) {
      return res.status(400).json({
        success: false,
        error: { message: "User address reference not found" }
      });
    }

    // 1. Get user's location info
    const userLocation = await UserCommunityAccess.findById(user.addressReference);

    if (!userLocation) {
      return res.status(404).json({
        success: false,
        error: { message: "User community access not found" }
      });
    }

    // 2. Get communities user already joined
    const joinedMemberships = await CommunityMembership.find({
      user: user._id,
      status_in_community: "active"
    }).select("community");
  

    const joinedCommunityIds = joinedMemberships.map(m => m.community);
    console.log(userLocation._id);
    
//  const v = await Community.find({
//       ucaRef: userLocation._id,
//        isActive: true
//     })
    
//     console.log(v)

    // 3. Find communities matching user's ucaref
    const availableCommunities = await Community.find({
     ucaRef: userLocation._id,
      _id: { $nin: joinedCommunityIds },
       isActive: true
    }).select("name description icon ");

    res.json({
      success: true,
      data: availableCommunities,
      total: availableCommunities.length
    });

  } catch (error) {
    next(error);
  }
};



export const getMyCommunitiesSimple = async (req, res, next) => {
  console.log("sdf");
  try {
    const userId = req.user._id;

    const memberships = await CommunityMembership.find({
      user: userId,
      status_in_community: "active"
    })
      .populate({
        path: "community",
        select: "name icon"
      });

    const communities = memberships
      .filter(m => m.community)
      .map(m => ({
        id: m.community._id,
        name: m.community.name,
        icon: m.community.icon
      }));

    res.json({
      data: communities,
      total: communities.length
    });
  } catch (error) {
    next(error);
  }
};
