// src/services/community.service.js

import mongoose from "mongoose";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";
import { DEFAULT_MARKETPLACE_CATEGORIES } from "../config/defaultCategories.js";
import dotenv from 'dotenv'
dotenv.config();

const SYSTEM_USER_ID =new mongoose.Types.ObjectId(process.env.SYSTEM_USER_ID);




const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

export const createDefaultCommunity = async (user, ucaRefId, autoJoin = true) => {
  if (!user || !user._id) throw new Error("User required");
  if (!isValidId(ucaRefId)) throw new Error("Invalid ucaRef id");

  // load ucaRef to use the ward / panchayath for naming
  const uca = await UserCommunityAccess.findById(ucaRefId).lean();
  if (!uca) throw new Error("UserCommunityAccess not found");

  // If a community already exists for this ucaRef, return it
  const existing = await Community.findOne({ ucaRef: uca._id, isActive: true }).lean();
  if (existing) return existing;

  // Build community name: "<Ward> Local Hub"
  const ward = uca.ward || uca.panchayath || uca.block || "Local";
  const communityName = `${ward} Local Hub`;

  // Create the community
//   const communityDoc = await Community.create({
//     name: communityName,
//     description: `${ward} local community hub automatically created.`,
//     ucaRef: uca._id,
//     icon:'',
//     banner:'',
//     allowedMarketplaceCategories: DEFAULT_MARKETPLACE_CATEGORIES,
//     isPrivate:true,
//     isActive: true,
//     createdBy: user._id
//   });


  const communityDoc = await Community.create({
        name: communityName,
        description:  `${ward} local community hub automatically created.` || "",
        createdBy: SYSTEM_USER_ID,
        hierarchy: uca.hierarchy || undefined,
        state: uca.state,
        district: uca.district,
        ucaRef: uca._id,
        taluk: uca.taluk,
        block: uca.block,
        panchayath: uca.panchayath, // align snapshot key with your UCA field
        ward: uca.ward, // pick what you display in feeds
        isPrivate:true,
         isActive: true,
         icon:'https://cdn-icons-png.flaticon.com/512/3090/3090423.png',
       banner:'https://previews.123rf.com/images/sabelskaya/sabelskaya2001/sabelskaya200100188/138068552-community-banner-cartoon-people-standing-near-giant-word-talking-to-each-other-social-group-event.jpg',
    allowedMarketplaceCategories: DEFAULT_MARKETPLACE_CATEGORIES,
        stats:{
          membersCount: 2,
          postsCount: 0
        },
      });
  

      if(systemuser){
        await CommunityMembership.create({
      user: SYSTEM_USER_ID,
      community: communityDoc._id,
      role: "admin", // or "admin" depending on your role enum
      status_in_community: "active",
    });
      }
  // Auto-join the creating user as 'creator' / admin (recommended)
  if (autoJoin) {
    await CommunityMembership.create({
      user: user._id,
      community: communityDoc._id,
      role: "member", // or "admin" depending on your role enum
      status_in_community: "active",
    });
  }

  return communityDoc;
};
