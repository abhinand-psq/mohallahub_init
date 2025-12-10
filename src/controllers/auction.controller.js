import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import mongoose from "mongoose";
import {getAuctionStatus} from "../utils/auctionStatus.js";
import CommunityMembership from "../models/CommunityMembership.js";

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

    const auction = await Auction.create({
      community: communityId,
      createdBy: userId,
      title: title.trim(),
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

     const thisauction = await Auction.findById(auctionId);
    if (!thisauction) {
      return res.status(404).json({
        success: false,
        error: { message: "Auction not found" },
      });
    }

    // 🚫 Prevent owner/seller from bidding on their own auction
  
    if (thisauction.createdBy && thisauction.createdBy.toString() === userId.toString()) {
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
