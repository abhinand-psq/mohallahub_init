import cron from "node-cron";
import Auction from "../models/Auction.js";
import { finalizeAuctionById } from "../services/auctionFinalize.service.js";

export const startAuctionAutoFinalize = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    try {
      const auctions = await Auction.find({
        isClosed: false,
        auctionEndTime: { $lt: now },
        isActive: true,
      }).select("_id");

      for (const auction of auctions) {
        try {
          await finalizeAuctionById(auction._id);
        } catch (err) {
          console.error("Finalize failed for auction:", auction._id, err.message);
        }
      }
    } catch (err) {
      console.error("Auction cron error:", err.message);
    }
  });
};
