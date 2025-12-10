import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import mongoose from "mongoose";

export const finalizeAuctionById = async (auctionId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const auction = await Auction.findById(auctionId).session(session);

    if (!auction || auction.isClosed) {
      await session.abortTransaction();
      return;
    }

    const highestBid = await Bid.findOne({ auction: auction._id })
      .sort({ amount: -1, createdAt: 1 })
      .session(session);

    if (!highestBid) {
      auction.isClosed = true;
      await auction.save({ session });
      await session.commitTransaction();
      return;
    }

    auction.winner = highestBid.bidder;
    auction.winningBid = highestBid._id;
    auction.isClosed = true;

    await auction.save({ session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
