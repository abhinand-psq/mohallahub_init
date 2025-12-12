// src/controllers/auction.controller.js

import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import mongoose from "mongoose";

export const getMyAuctions = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    // Fetch auctions created by this user
    const auctions = await Auction.find({ createdBy: userId }).populate("winningBid","amount").populate("winner", "email username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const now = new Date();



    // Attach computed status + highest bid info
    for (let item of auctions) {
      console.log('df' , item.isClosed);
                     let status;
if (item.isClosed === true) {
    status = "ended";        // manual or natural end
} else {
    const now = new Date();
    if (now < item.auctionStartTime) status = "scheduled";
    else if (now <= item.auctionEndTime) status = "active";
    else status = "ended";   // time-based end
}
      item.status = status;
      

      // highest bid history (optional enhancement)
      // const highestBid = await Bid.findOne({ auction: item._id })
      //   .sort({ amount: -1 })
      //   .select("amount bidder")
      //   .lean();

      // item.highestBid = highestBid || null;
    }

    console.log(auctions)
    const total = await Auction.countDocuments({ createdBy: userId });

    return res.json({
      success: true,
      data: auctions,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (err) {
    next(err);
  }
};
