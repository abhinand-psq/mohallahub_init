// src/services/community.service.js
import mongoose from "mongoose";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";
import { DEFAULT_MARKETPLACE_CATEGORIES } from "../config/defaultCategories.js";
import  findOrCreateAreaSystemUser from "./CreateSystemUser.js";

const ObjectId = mongoose.Types.ObjectId;

const isValidId = (id) => {
  try {
    return ObjectId.isValid(String(id));
  } catch {
    return false;
  }
};

/**
 * createDefaultCommunity:
 * - idempotent: returns existing community if present
 * - uses atomic upsert to avoid duplicate creation under concurrency
 * - will auto-create memberships for system user and the provided user (if autoJoin=true)
 */
export const createDefaultCommunity = async (user, ucaRefId, autoJoin = true) => {
  console.log("haa ut here");
  console.log(ucaRefId)
  if (!user || !user._id) throw new Error("User required");
  if (!isValidId(ucaRefId)) throw new Error("Invalid ucaRef id");

  // load ucaRef
  const uca = await UserCommunityAccess.findById(ucaRefId).lean();
  if (!uca) throw new Error("UserCommunityAccess not found");
 
  



  // Build community name: "<Ward> Local Hub"
  const wardLabel = uca.ward || uca.panchayath || uca.block || "Local";
  const communityName = `${uca.panchayath} ${wardLabel} Local Hub`;

  // Use an atomic upsert so concurrent requests don't create duplicates.
  // Partial unique index on ucaRef should exist on Community schema.
  const filter = { ucaRef: uca._id, isActive: true };
  const update = {
    $setOnInsert: {
      name: communityName,
      description: `${wardLabel} local community hub automatically created.`,
      ucaRef: uca._id,
      hierarchy:  [uca.state, uca.district, uca.taluk, uca.block, uca.panchayath, uca.ward].filter(Boolean).join("-"),
      state: uca.state,
      district: uca.district,
      taluk: uca.taluk,
      block: uca.block,
      isDefault:true,
      panchayath: uca.panchayath,
      ward: uca.ward,
      isPrivate: true,
      isActive: true,
      icon: "https://cdn-icons-png.flaticon.com/512/3090/3090423.png",
      banner:
        "https://previews.123rf.com/images/sabelskaya/sabelskaya2001/sabelskaya200100188/138068552-community-banner-cartoon-people-standing-near-giant-word-talking-to-each-other-social-group-event.jpg",
      allowedMarketplaceCategories: DEFAULT_MARKETPLACE_CATEGORIES,
      // createdBy set below after ensuring per-area system user exists
      stats: { membersCount: 0, postsCount: 0 },
    },
  };
  
  // Try to atomically create or get the existing community
  let communityDoc;
  try {
    communityDoc = await Community.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();
    console.log(communityDoc);
  } catch (err) {
    // If unique index race occurs, re-fetch existing
    if (err.code === 11000) {
      communityDoc = await Community.findOne(filter).lean();
    } else {
      throw err;
    }
  }

  if (!communityDoc) {

    communityDoc = await Community.findOne(filter).lean();
    if (!communityDoc) throw new Error("Failed to create or retrieve community");
  }

  // Ensure there's a per-area system user; if community already existed and has createdBy, keep it.
  let systemUserObj = null;
  if (!communityDoc.createdBy) {
    try {
      systemUserObj = await findOrCreateAreaSystemUser(uca);
      // If the community was just upserted without createdBy, set it now (race-safe: use updateOne)
      await Community.updateOne(
        { _id: communityDoc._id, $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
        { $set: { createdBy:new ObjectId(systemUserObj._id) } }
      ).catch((e) => {throw new Error(e.message)});
      // refresh communityDoc to include createdBy
      communityDoc = await Community.findById(communityDoc._id).lean();
    } catch (e) {
      // don't fail flow; log and continue using user as createdBy fallback
      console.error("area system user creation error:", e.message);
    }
  } else {
    // community already has createdBy - we can load that system user if needed
    // (optional) systemUserObj = await User.findById(communityDoc.createdBy).lean();
  }

  // Create memberships: system user (if available) and the requesting user (autoJoin)
  // Use try/catch to avoid failing the flow on duplicate-key race.
  const toCreateMembership = [];

  const systemUserIdToUse =
    (systemUserObj && systemUserObj._id) ||
    (communityDoc.createdBy ? communityDoc.createdBy : null);

  if (systemUserIdToUse) {
    try {
      toCreateMembership.push(
        CommunityMembership.create({
          user:new ObjectId(systemUserIdToUse),
          community: communityDoc._id,
          role: "owner",
          status_in_community: "active",
          joinedAt: new Date(),
        })
      );
    } catch (e) {
      // ignore duplicate membership error
      if (e.code !== 11000) {
        console.error("system membership creation error:", e.message);
      }
    }
  }

  if (autoJoin) {
    try {
      toCreateMembership.push(
        CommunityMembership.create({
          user:new ObjectId(user._id),
          community: communityDoc._id,
          role: "member",
          status_in_community: "active",
          joinedAt: new Date(),
        })
      );
    } catch (e) {
      if (e.code !== 11000) {
        console.error("user membership creation error:", e.message);
      }
    }
  }

  // Wait for any creations (non-blocking)
  if (toCreateMembership.length) {
    try {
      await Promise.allSettled(toCreateMembership);
      // Optionally increment membersCount for successful creations:
      try {
        await Community.updateOne({ _id: communityDoc._id }, { $inc: { "stats.membersCount": toCreateMembership.length } }).catch(() => {});
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore
    }
  }

  return communityDoc;
};