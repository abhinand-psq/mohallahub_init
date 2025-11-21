// src/routes/marketplace.routes.js
import express from "express";
import multer from "multer";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as marketplaceController from "../controllers/marketplace.controller.js";

const upload = multer(); // your existing uploadMiddleware can be used instead

const router = express.Router();

// Create shop (logo/banner optional)
router.post(
  "/community/:communityId/marketplace/shop",
  authMiddleware,
  upload.fields([{ name: "logo", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  [ body("name").isLength({ min: 2 }) ],
  validateRequest,
  marketplaceController.createShop
);

// List shops in community
router.get("/community/:communityId/marketplace", authMiddleware, marketplaceController.listShops);

// Get shop
router.get("/shop/:shopId", authMiddleware, marketplaceController.getShop);

// Create product (single image)
router.post(
  "/shop/:shopId/product",
  authMiddleware,
  upload.fields([{ name: "image", maxCount: 1 }]),
  [ body("title").isLength({ min: 2 }), body("price").isNumeric(), body("category").notEmpty(), body("condition").isIn(["new","used"]) ],
  validateRequest,
  marketplaceController.createProduct
);

// List products
router.get("/shop/:shopId/products", authMiddleware, marketplaceController.listProducts);

// Report product
router.post("/product/:productId/report", authMiddleware, marketplaceController.reportProduct);

// Admin block/unblock product
router.post("/product/:productId/block", authMiddleware, marketplaceController.blockProduct);

export default router;
