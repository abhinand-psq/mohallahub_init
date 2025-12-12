import Post from "../models/Post.js";
import CommunityMembership from "../models/CommunityMembership.js";
import Auction from "../models/Auction.js";


export const getUserFeed = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const memberships = await CommunityMembership.find({
      user: userId,
      status_in_community: "active"
    }).select("community");

    const communityIds = memberships.map(m => m.community);

    if (!communityIds.length) {
      return res.json({ success: true, data: [] });
    }

    const posts = await Post.find({
      community: { $in: communityIds },
      isDeleted: false
    })
    .populate("author", "username profilePic")
    .populate("community", "name")
    .populate({
      path: "rePostOf",
      populate: [
        { path: "author", select: "username profilePic" },
        { path: "community", select: "name" }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Post.countDocuments({
      community: { $in: communityIds },
      isDeleted: false
    });

    res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};



export const getAuctionFeed = async (req, res, next) => {
  console.log("hay");
  
  try {
    const userId = req.user._id;

    // get joined communities
    const memberships = await CommunityMembership.find({
      user: userId,
      status_in_community: "active",
    }).select("community");

    const communityIds = memberships.map(m => m.community);

    const auctions = await Auction.find({
      community: { $in: communityIds },
      isActive: true,
    })
      .sort({ auctionStartTime: -1 })
      .populate("createdBy", "username profilePic")
      .populate("winner", "username")
      .lean();

    const now = new Date();

    const enriched = auctions.map(a => ({
      ...a,
      status:
        a.isClosed
          ? "ended"
          : now < a.auctionStartTime
          ? "scheduled"
          : now <= a.auctionEndTime
          ? "active"
          : "ended",
    }));
console.log("newdata",enriched);

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};


