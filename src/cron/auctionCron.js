import cron from "node-cron";
import Auction from "../models/Auction.js";

cron.schedule("* * * * *", async () => {
  const now = new Date();

  const expiredAuctions = await Auction.find({
    status: "active",
    auctionEndTime: { $lte: now },
  });

  for (const auction of expiredAuctions) {
    if (auction.status === "closed") continue;

    auction.status = "closed";
    auction.winner = auction.currentHighestBidder;
    auction.winningBid = auction.currentHighestBid;

    await auction.save();
    console.log(`✅ Auto-closed auction: ${auction._id}`);
  }
});
