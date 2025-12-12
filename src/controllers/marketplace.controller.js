// src/controllers/marketplace.controller.js
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import User from "../models/User.js";
import Report from "../models/Report.js"; // if you have Report model; else create simple schema
import { uploadBuffer } from "../services/cloudinary.service.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

const SHOP_MIN_MEMBERSHIP_DAYS = parseInt(process.env.SHOP_MIN_MEMBERSHIP_DAYS || "7", 10); // default 7 days
const MAX_SHOPS_PER_USER = parseInt(process.env.MAX_SHOPS_PER_USER || "3", 10);
const MAX_PRODUCTS_PER_SHOP = parseInt(process.env.MAX_PRODUCTS_PER_SHOP || "20", 10); // configurable

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

/**
 * Create Shop
 * POST /community/:communityId/marketplace/shop
 * multipart: logo, banner (optional)
 */
export const createShop = async (req, res, next) => {
  console.log(req.body)
 
  try {
    const ownerId = req.user?._id;
    const communityId = req.params.communityId;
    const { name, description, categories = [] } = req.body;

    if (!ownerId) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    if (!isValidId(communityId)) return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: { message: "Shop name required" } });

    // community exists
    const community = await Community.findById(communityId).lean();
    if (!community) return res.status(404).json({ success: false, error: { message: "Community not found" } });

    // membership check
    const membership = await CommunityMembership.findOne({ user: ownerId, community: communityId }).lean();
    if (!membership) return res.status(403).json({ success: false, error: { message: "Join community to open a shop" } });

    // membership age check
    // if (SHOP_MIN_MEMBERSHIP_DAYS > 0) {
    //   const joinDate = membership.joinedAt || membership.createdAt || membership._id.getTimestamp();
    //   const diffDays = Math.floor((Date.now() - new Date(joinDate).getTime()) / (24 * 60 * 60 * 1000));
    //   if (diffDays < SHOP_MIN_MEMBERSHIP_DAYS) {
    //     return res.status(403).json({ success: false, error: { message: `You must be a community member for at least ${SHOP_MIN_MEMBERSHIP_DAYS} days to open a shop` } });
    //   }
    // }

    // per-user shop limit (across all communities)
    const userShopCount = await Shop.countDocuments({ owner: ownerId });
    if (userShopCount >= MAX_SHOPS_PER_USER) {
      return res.status(400).json({ success: false, error: { message: `You can create up to ${MAX_SHOPS_PER_USER} shops total` } });
    }

    // one shop per community per user (unique index enforces it, but check earlier for friendlier error)
    const existing = await Shop.findOne({ owner: ownerId, community: communityId }).lean();
    if (existing) {
      return res.status(400).json({ success: false, error: { message: "You already have a shop in this community" } });
    }

    // Validate categories against community.allowedMarketplaceCategories if present
    if (community.allowedMarketplaceCategories && community.allowedMarketplaceCategories.length > 0) {
      const invalid = categories.filter(c => !community.allowedMarketplaceCategories.includes(c));
      if (invalid.length) {
        return res.status(400).json({ success: false, error: { message: `Category not allowed in this community: ${invalid.join(", ")}` } });
      }
    }

    // Handle optional media uploads (logo, banner)
    let logo = undefined, banner = undefined;
    if (req.files?.logo?.[0]) {
      const up = await uploadBuffer(req.files.logo[0].buffer, { folder: `shops/${ownerId}`, resource_type: "image" });
      logo = { url: up.secure_url, publicId: up.public_id };
    }
    if (req.files?.banner?.[0]) {
      const up = await uploadBuffer(req.files.banner[0].buffer, { folder: `shops/${ownerId}`, resource_type: "image" });
      banner = { url: up.secure_url, publicId: up.public_id };
    }

    const shopDoc = await Shop.create({
      name: name.trim(),
      community: communityId,
      owner: ownerId,
      description: description || "",
      categories,
      logo,
      banner,
      isActive: true
    });

    return res.status(201).json({ success: true, data: { shop: shopDoc } });
  } catch (err) {
    next(err);
  }
};

/**
 * List shops in a community
 * GET /community/:communityId/marketplace
 */
export const listShops = async (req, res, next) => {
  try {
    const communityId = req.params.communityId;
    if (!isValidId(communityId)) return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });

    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    const filter = { community: communityId, isActive: true };

    const total = await Shop.countDocuments(filter);
    const items = await Shop.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "username firstName profilePic")
      .lean();

    res.json({ success: true, meta: { total, page, limit }, data: items });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single shop
 * GET /shop/:shopId
 */
export const getShop = async (req, res, next) => {
  try {
    const shopId = req.params.shopId;
    if (!isValidId(shopId)) return res.status(400).json({ success: false, error: { message: "Invalid shop ID" } });

    const shop = await Shop.findById(shopId).populate("owner", "username firstName profilePic").lean();
    if (!shop) return res.status(404).json({ success: false, error: { message: "Shop not found" } });

    res.json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
};

/**
 * Create product in a shop
 * POST /shop/:shopId/product
 * multipart: image (single)
 */
export const createProduct = async (req, res, next) => {
  try {
    const sellerId = req.user?._id;
    const shopId = req.params.shopId;
    const { title, description, price, stock = 1, category, condition } = req.body;

    if (!sellerId) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    if (!isValidId(shopId)) return res.status(400).json({ success: false, error: { message: "Invalid shop ID" } });

    if (!title || !title.trim() || !price || !category || !condition) {
      return res.status(400).json({ success: false, error: { message: "Missing required fields" } });
    }
    if (!["new", "used"].includes(condition)) {
      return res.status(400).json({ success: false, error: { message: "Invalid condition" } });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ success: false, error: { message: "Shop not found" } });

    // Only shop owner can add products
    if (shop.owner.toString() !== sellerId.toString()) {
      return res.status(403).json({ success: false, error: { message: "Only shop owner can add products" } });
    }

    // product count limit
    const productCount = await Product.countDocuments({ shop: shopId, isDeleted: false });
    if (productCount >= MAX_PRODUCTS_PER_SHOP) {
      return res.status(400).json({ success: false, error: { message: `Shop product limit reached (max ${MAX_PRODUCTS_PER_SHOP})` } });
    }

    // enforce single image
    if (!req.files?.image?.[0]) {
      return res.status(400).json({ success: false, error: { message: "Product image required (single image)" } });
    }

    // Validate category against community allowed categories
    const community = await Community.findById(shop.community).lean();
    if (community.allowedMarketplaceCategories && community.allowedMarketplaceCategories.length > 0) {
      if (!community.allowedMarketplaceCategories.includes(category)) {
        return res.status(400).json({ success: false, error: { message: "Product category not allowed in this community" } });
      }
    }

    // upload image
    const img = req.files.image[0];
    const up = await uploadBuffer(img.buffer, { folder: `shops/${shopId}/products`, resource_type: "image" });
    const image = { url: up.secure_url, publicId: up.public_id };

    const product = await Product.create({
      shop: shopId,
      community: shop.community,
      seller: sellerId,
      title: title.trim(),
      description: description || "",
      price: Number(price),
      stock: Number(stock || 1),
      category,
      condition,
      image,
      isActive: true
    });

    // increment shop productCount
    await Shop.findByIdAndUpdate(shopId, { $inc: { "stats.productCount": 1 } });

    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
};

/**
 * List products for a shop
 * GET /shop/:shopId/products
 */
export const listProducts = async (req, res, next) => {
  try {
    const shopId = req.params.shopId;
    if (!isValidId(shopId)) return res.status(400).json({ success: false, error: { message: "Invalid shop ID" } });

    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    const filter = { shop: shopId, isDeleted: false, isActive: true };
    const total = await Product.countDocuments(filter);

    const items = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ success: true, meta: { total, page, limit }, data: items });
  } catch (err) {
    next(err);
  }
};

/**
 * Report a product
 * POST /product/:productId/report
 * body: reason, details
 */
export const reportProduct = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const reporterId = req.user?._id;
    const { reason = "other", details = "" } = req.body;

    if (!reporterId) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    if (!isValidId(productId)) return res.status(400).json({ success: false, error: { message: "Invalid product ID" } });

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ success: false, error: { message: "Product not found" } });

    // create report doc (you already have Report model - reuse it)
    const rep = await Report.create({
      reportedBy: reporterId,
      targetProduct: product._id,
      reason,
      details,
      status: "pending"
    });

    res.json({ success: true, data: { report: rep } });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin block/unblock product
 * POST /product/:productId/block
 * body: action = "block" | "unblock"
 */
export const blockProduct = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, error: { message: "Admin only" } });

    const { action } = req.body;
    const productId = req.params.productId;
    if (!isValidId(productId)) return res.status(400).json({ success: false, error: { message: "Invalid product ID" } });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, error: { message: "Product not found" } });

    if (action === "block") {
      product.isActive = false;
      await product.save();
      return res.json({ success: true, data: { message: "Product blocked" } });
    } else if (action === "unblock") {
      product.isActive = true;
      await product.save();
      return res.json({ success: true, data: { message: "Product unblocked" } });
    } else {
      return res.status(400).json({ success: false, error: { message: "Invalid action" } });
    }
  } catch (err) {
    next(err);
  }
};


