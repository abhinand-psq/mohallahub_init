import express from 'express'
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { getMyAuctions } from '../controllers/auction.user.controller.js';
const router = express.Router();

router.get("/my-auctions", authMiddleware, getMyAuctions);
export default router