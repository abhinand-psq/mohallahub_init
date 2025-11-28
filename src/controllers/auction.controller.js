import mongoose from "mongoose";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import CommunityMembership from "../models/CommunityMembership.js";

/* CREATE AUCTION */
export const createAuction = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { communityId } = req.params;
    const {
      title,
      description,
      startingPrice,
      minimumIncrement,
      auctionStartTime,
      auctionEndTime,
    } = req.body;

    const membership = await CommunityMembership.findOne({
      user: sellerId,
      community: communityId,
      status_in_community: "active",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { message: "Join community to create auction" },
      });
    }

    const auction = await Auction.create({
      community: communityId,
      seller: sellerId,
      title,
      description,
      startingPrice,
      minimumIncrement,
      auctionStartTime,
      auctionEndTime,
      status: new Date() >= new Date(auctionStartTime) ? "active" : "scheduled",
    });

    res.status(201).json({ success: true, data: auction });
  } catch (err) {
    next(err);
  }
};

/* PLACE BID – HARD SAFETY */
export const placeBid = async (req, res, next) => {
  try {
    const bidderId = req.user._id;
    const { auctionId } = req.params;
    const { amount } = req.body;

    const auction = await Auction.findById(auctionId);
    if (!auction || auction.isDeleted) {
      return res.status(404).json({ success: false, error: { message: "Auction not found" } });
    }

    if (auction.status === "closed" || auction.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: { message: "Bidding is closed for this auction" },
      });
    }

    if (new Date() > auction.auctionEndTime) {
      return res.status(400).json({
        success: false,
        error: { message: "Auction has expired and no more bids allowed" },
      });
    }

    const membership = await CommunityMembership.findOne({
      user: bidderId,
      community: auction.community,
      status_in_community: "active",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { message: "Join community to bid" },
      });
    }

    const current = auction.currentHighestBid || auction.startingPrice;
    const minAllowed = current + auction.minimumIncrement;

    if (amount < minAllowed) {
      return res.status(400).json({
        success: false,
        error: { message: `Minimum bid must be ${minAllowed}` },
      });
    }

    await Bid.create({ auction: auctionId, bidder: bidderId, amount });

    auction.currentHighestBid = amount;
    auction.currentHighestBidder = bidderId;
    auction.bidCount += 1;
    await auction.save();

    res.json({ success: true, message: "Bid placed successfully" });
  } catch (err) {
    next(err);
  }
};

/* MANUAL CLOSE */
export const closeAuction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ success: false, error: { message: "Auction not found" } });

    if (auction.status === "closed") {
      return res.status(400).json({
        success: false,
        error: { message: "Auction already closed" },
      });
    }
      
    if (String(auction.seller) !== String(userId)) {
      return res.status(403).json({
        success: false,
        error: { message: "Not authorized" },
      });
    }

    auction.status = "closed";
    auction.winner = auction.currentHighestBidder;
    auction.winningBid = auction.currentHighestBid;
    await auction.save();

    res.json({ success: true, message: "Auction closed manually" });
  } catch (err) {
    next(err);
  }
};
