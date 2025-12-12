import express from 'express'
import { authMiddleware } from "../middleware/authMiddleware.js";
import { closeBidding,getAuctionBidHistory, createAuction, finalizeAuction, placeBid,getAuctionFeedForCommunity, getAuctionById } from '../controllers/auction.controller.js'
import { getAuctionFeed } from '../controllers/feed.controller.js'
import { upload } from "../middleware/uploadMiddleware.js";
const router = express.Router();


router.post("/create", upload.fields([{ name: "image", maxCount: 1 }]), authMiddleware, createAuction);
router.get("/feed/auctions", authMiddleware, getAuctionFeed);
router.post("/bids/:auctionId/bid", authMiddleware, placeBid);
router.post("/auctions/:auctionId/finalize", authMiddleware, finalizeAuction);
router.post("/auctions/:auctionId/close", authMiddleware, closeBidding);
router.get("/community/:communityId/feed", authMiddleware, getAuctionFeedForCommunity);
router.get("/:auctionId", authMiddleware, getAuctionById);
router.get("/:auctionId/history", authMiddleware, getAuctionBidHistory);
export default router