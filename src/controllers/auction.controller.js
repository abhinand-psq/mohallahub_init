import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import mongoose from "mongoose";
import {getAuctionStatus} from "../utils/auctionStatus.js";
import CommunityMembership from "../models/CommunityMembership.js";
import { uploadBuffer } from "../services/cloudinary.service.js";

export const createAuction = async (req, res, next) => {
  console.log("its ork");
  
  try {
    const userId = req.user._id;
    const {
      communityId,
      title,
      description,
      startingPrice,
      minimumBidIncrement,
      auctionStartTime,
      auctionEndTime,
    } = req.body;
    
    console.log(auctionStartTime,auctionEndTime)
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({ success: false, message: "Invalid community ID" });
    }

    if (!title || !startingPrice || !auctionStartTime || !auctionEndTime) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const start = new Date(auctionStartTime);
    const end = new Date(auctionEndTime);
    const now = new Date();

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "Auction end time must be after start time",
      });
    }

    // ✅ Community membership check
    const membership = await CommunityMembership.findOne({
      user: userId,
      community: communityId,
      status_in_community: "active",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this community to create an auction",
      });
    }

    let image = null;

    if (req.files?.image?.[0]) {
      const file = req.files.image[0];
      const upload = await uploadBuffer(file.buffer, {
        folder: `auction/${communityId}`,
        resource_type: "image"
      });

      image = {
        url: upload.secure_url,
        publicId: upload.public_id
      };
    }


    const auction = await Auction.create({
      community: communityId,
      createdBy: userId,
      title: title.trim(),
        image, 
      description: description || "",
      startingPrice,
      minimumBidIncrement: minimumBidIncrement || 1,
      auctionStartTime: start,
      auctionEndTime: end,
    });

    res.status(201).json({
      success: true,
      message: "Auction created successfully",
      data: auction,
    });
  } catch (err) {
    next(err);
  }
};


export const closeBidding = async (req, res, next) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({ success: false, message: "Invalid auction ID" });
    }

    const auction = await Auction.findById(auctionId);

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const isOwner = auction.createdBy.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to close bidding",
      });
    }

    if (auction.isClosed) {
      return res.status(400).json({
        success: false,
        message: "Auction already closed",
      });
    }

    auction.isClosed = true;
    await auction.save();

    res.json({
      success: true,
      message: "Bidding closed successfully",
      data: { auctionId: auction._id },
    });
  } catch (err) {
    next(err);
  }
};



export const placeBid = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { auctionId } = req.params;
    const { amount } = req.body;
    const userId = req.user._id;

    console.log(amount)

     const thisauction = await Auction.findById(auctionId);
    if (!thisauction) {
      return res.status(404).json({
        success: false,
        error: { message: "Auction not found" },
      });
    }

    // 🚫 Prevent owner/seller from bidding on their own auction
  
    if (thisauction.createdBy && thisauction.createdBy.toString() === userId.toString()) {
      console.log("oops");
      
      return res.status(400).json({
        success: false,
        error: { message: "Auction owner cannot place bids on their own auction" },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({ success: false, message: "Invalid auction ID" });
    }

    const bidAmount = Number(amount);
    if (!bidAmount || bidAmount <= 0) {
      console.log("okey here is problem");
      
      return res.status(400).json({ success: false, message: "Invalid bid amount" });
    }

    // 🔒 Lock auction row
    const auction = await Auction.findOne({ _id: auctionId, isActive: true })
      .session(session)
      .exec();

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // ⏱ Time-based validation
    const status = getAuctionStatus(auction);
    if (status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Auction is ${status}, cannot place bid`,
      });
    }

    const minAllowedBid =
      Math.max(auction.startingPrice, auction.stats.highestBidAmount) +
      auction.minimumBidIncrement;

    if (bidAmount < minAllowedBid) {
      return res.status(400).json({
        success: false,
        message: `Minimum allowed bid is ${minAllowedBid}`,
      });
    }

    // ✅ Create bid (immutable)
    const bid = await Bid.create(
      [
        {
          auction: auction._id,
          bidder: userId,
          amount: bidAmount,
        },
      ],
      { session }
    );

    // ✅ Update auction stats atomically
    auction.stats.highestBidAmount = bidAmount;
    auction.stats.bidCount += 1;

    await auction.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: {
        bidId: bid[0]._id,
        auctionId: auction._id,
        amount: bidAmount,
      },
    });
  } catch (err) {
    await session.abortTransaction();

    // duplicate bid (same user + amount)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate bid detected",
      });
    }

    next(err);
  } finally {
    session.endSession();
  }
};


export const finalizeAuction = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { auctionId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({ success: false, message: "Invalid auction ID" });
    }

    const auction = await Auction.findById(auctionId)
      .session(session)
      .exec();

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // 🔐 Authorization (creator or admin)
    const isOwner = auction.createdBy.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // ⛔ Already finalized
    if (auction.isClosed || auction.winner) {
      return res.status(400).json({
        success: false,
        message: "Auction already finalized",
      });
    }

    // ⏱ Time validation
    const status = getAuctionStatus(auction);
    if (status !== "ended") {
      return res.status(400).json({
        success: false,
        message: "Auction has not ended yet",
      });
    }

    // 🔎 Find highest bid
    const highestBid = await Bid.findOne({ auction: auction._id })
      .sort({ amount: -1, createdAt: 1 }) // tie-breaker: earlier bid wins
      .session(session)
      .exec();

    if (!highestBid) {
      // ✅ No bids case
      auction.isClosed = true;
      await auction.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        message: "Auction ended with no bids",
        data: {
          auctionId: auction._id,
          winner: null,
        },
      });
    }

    // ✅ Assign winner
    auction.winningBid = highestBid._id;
    auction.winner = highestBid.bidder;
    auction.isClosed = true;

    await auction.save({ session });

    await session.commitTransaction();

    return res.json({
      success: true,
      message: "Auction finalized successfully",
      data: {
        auctionId: auction._id,
        winner: auction.winner,
        winningBidAmount: highestBid.amount,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const getAuctionFeedForCommunity = async (req, res, next) => {
  try {
    const communityId = req.params.communityId;

    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({ success: false, message: "Invalid community ID" });
    }

    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    // Fetch auctions for this community
    const auctions = await Auction.find({ community: communityId })
      .sort({ auctionStartTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const now = new Date();

    // Attach status + highest bid
    const results = await Promise.all(
      auctions.map(async (auction) => {
        let status;

if (auction.isClosed === true) {
    status = "ended";        // manual or natural end
} else {
    const now = new Date();
    if (now < auction.auctionStartTime) status = "scheduled";
    else if (now <= auction.auctionEndTime) status = "active";
    else status = "ended";   // time-based end
}

    
        const highestBid = await Bid.findOne({ auction: auction._id })
          .sort({ amount: -1 })
          .lean();

        return {
          ...auction,
          status,
          highestBid: highestBid
            ? { amount: highestBid.amount, bidder: highestBid.bidder }
            : null,
        };
      })
    );

    const total = await Auction.countDocuments({ community: communityId });

    return res.json({
      success: true,
      data: results,
      pagination: { page, limit, total }
    });

  } catch (err) {
    next(err);
  }
};

// GET one auction by ID
export const getAuctionById = async (req, res, next) => {
  console.log("hell");
  
  try {
    const auctionId = req.params.auctionId;

    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid auction ID" }
      });
    }

    const auction = await Auction.findById(auctionId)
      .populate("createdBy", "username firstName lastName profilePic isVerified")
      .populate("winner", "username firstName lastName profilePic")
      .lean();

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: { message: "Auction not found" }
      });
    }

    // if (auction.isClosed === true) {
    //   return res.status(404).json({
    //     success: false,
    //     error: { message: "Auction already ended or closed by owner" }
    //   });
    // }

    // determine status dynamically
    let status;

if (auction.isClosed === true) {
    status = "ended";        // manual or natural end
} else {
    const now = new Date();
    if (now < auction.auctionStartTime) status = "scheduled";
    else if (now >= auction.auctionStartTime && now <= auction.auctionEndTime) status = "active";
    else status = "ended";   // time-based end
}

    // populate highest bid if exists
    let highestBid = null;

    if (auction.stats?.highestBidAmount > 0) {
      const topBid = await Bid.findOne({ auction: auction._id })
        .sort({ amount: -1 })
        .populate("bidder", "username firstName lastName profilePic")
        .lean();

      if (topBid) {
        highestBid = {
          amount: topBid.amount,
          bidder: topBid.bidder
        };
      }
    }

    console.log(auction);
    

    return res.json({
      success: true,
      data: {
        ...auction,
        status,
        highestBid
      }
    });

  } catch (err) {
    next(err);
  }
};




export const getAuctionBidHistory = async (req, res, next) => {
  try {
    const { auctionId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid auction ID" }
      });
    }

    // Check auction exists
    const auction = await Auction.findById(auctionId).lean();
    if (!auction) {
      return res.status(404).json({
        success: false,
        error: { message: "Auction not found" }
      });
    }

    // Fetch bid history sorted from newest → oldest
    const history = await Bid.find({ auction: auctionId })
      .populate("bidder", "username firstName lastName profilePic")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: {
        auctionId,
        totalBids: history.length,
        history
      }
    });
  } catch (err) {
    next(err);
  }
};
