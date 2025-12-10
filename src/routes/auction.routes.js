import express from 'express'
import { authMiddleware } from "../middleware/authMiddleware.js";
import { closeBidding, createAuction, finalizeAuction, placeBid } from '../controllers/auction.controller.js'
import { getAuctionFeed } from '../controllers/feed.controller.js'
const router = express.Router();


router.post("/create", authMiddleware, createAuction);
router.get("/auctions", authMiddleware, getAuctionFeed);
router.post("/bids/:auctionId/bid", authMiddleware, placeBid);
router.post("/auctions/:auctionId/finalize", authMiddleware, finalizeAuction);
router.post("/auctions/:auctionId/close", authMiddleware, closeBidding);

export default router