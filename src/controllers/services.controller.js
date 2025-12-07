// src/controllers/services.controller.js
import Service from "../models/Service.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";
import Report from "../models/Report.js"; // if exists; else skip reporting DB persistence
import { uploadBuffer } from "../services/cloudinary.service.js";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;
const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

/**
 * createService
 * POST /api/v1/communities/:communityId/services
 */
export const createService = async (req, res, next) => {
  try {
    const providerId = req.user?._id;
    const communityId = req.params.communityId;
    const { title, description = "", category, priceMin, priceMax, phone, available = true } = req.body;

    // basic validation
    if (!providerId) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    if (!isValidId(communityId)) return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });
    if (!title || !category || priceMin == null || priceMax == null || !phone) {
      return res.status(400).json({ success: false, error: { message: "Missing required fields" } });
    }
    if (Number(priceMin) > Number(priceMax)) {
      return res.status(400).json({ success: false, error: { message: "priceMin cannot be greater than priceMax" } });
    }

    // community exists
    const community = await Community.findById(communityId).lean();
    if (!community) return res.status(404).json({ success: false, error: { message: "Community not found" } });

    // membership check: provider must be active member
    const membership = await CommunityMembership.findOne({ user: providerId, community: communityId, status_in_community: "active" });
    if (!membership) return res.status(403).json({ success: false, error: { message: "Join community to post services" } });

    // category allowed in the community?
    if (community.allowedMarketplaceCategories && community.allowedMarketplaceCategories.length > 0) {
      if (!community.allowedMarketplaceCategories.includes(category)) {
        return res.status(400).json({ success: false, error: { message: "Category not allowed in this community" } });
      }
    }

    // handle single image (optional)
    let image = null;
    if (req.files?.image?.[0]) {
      const file = req.files.image[0];
      const up = await uploadBuffer(file.buffer, { folder: `services/${providerId}`, resource_type: "image" });
      image = { url: up.secure_url, publicId: up.public_id, width: up.width, height: up.height };
    }

    // create service
    const service = await Service.create({
      title: title.trim(),
      description,
      category,
      priceMin: Number(priceMin),
      priceMax: Number(priceMax),
      provider: providerId,
      community: communityId,
      ucaRef: community.ucaRef || community.ucaRef, // ensure presence
      phone,
      image,
      available: Boolean(available),
      isActive: true,
      isDeleted: false
    });

    res.status(201).json({ success: true, data: { service } });
  } catch (err) {
    next(err);
  }
};

/**
 * listServicesInCommunity
 * GET /api/v1/communities/:communityId/services
 * Query: ?page=1&limit=20&category=plumber&available=true&minPrice=100&maxPrice=500
 */
export const listServicesInCommunity = async (req, res, next) => {
  try {
    const communityId = req.params.communityId;
    if (!isValidId(communityId)) return res.status(400).json({ success: false, error: { message: "Invalid community ID" } });

    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    const filter = { community:new ObjectId(communityId), isDeleted: false, isActive: true };

    if (req.query.category) filter.category = req.query.category;
    if (req.query.available) filter.available = req.query.available === "true";
    if (req.query.minPrice) filter.priceMin = { $gte: Number(req.query.minPrice) };
    if (req.query.maxPrice) filter.priceMax = { $lte: Number(req.query.maxPrice) };

    const total = await Service.countDocuments(filter);
    const items = await Service.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("provider", "username firstName profilePic")
      .lean();

    res.json({ success: true, meta: { total, page, limit }, data: items });
  } catch (err) {
    next(err);
  }
};

/**
 * getService
 * GET /api/v1/services/:serviceId
 */
export const getService = async (req, res, next) => {
  try {
    const serviceId = req.params.serviceId;
    if (!isValidId(serviceId)) return res.status(400).json({ success: false, error: { message: "Invalid service ID" } });

    const service = await Service.findById(serviceId).populate("provider", "username firstName profilePic").lean();
    if (!service || service.isDeleted) return res.status(404).json({ success: false, error: { message: "Service not found" } });

    // optionally increment view count (non-blocking)
    Service.findByIdAndUpdate(serviceId, { $inc: { "stats.views": 1 } }).catch(() => {});

    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

/**
 * updateService
 * PUT /api/v1/services/:serviceId
 * provider only (owner)
 */
export const updateService = async (req, res, next) => {
  try {
    const providerId = req.user?._id;
    const serviceId = req.params.serviceId;
    if (!providerId) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    if (!isValidId(serviceId)) return res.status(400).json({ success: false, error: { message: "Invalid service ID" } });

    const service = await Service.findById(serviceId);
    if (!service || service.isDeleted) return res.status(404).json({ success: false, error: { message: "Service not found" } });

    if (service.provider.toString() !== providerId.toString()) {
      return res.status(403).json({ success: false, error: { message: "Only provider can edit service" } });
    }

    // update allowed fields: title, description, priceMin, priceMax, phone, available
    const updatable = ["title", "description", "priceMin", "priceMax", "phone", "available", "category"];
    updatable.forEach((k) => {
      if (req.body[k] !== undefined) service[k] = req.body[k];
    });

    // handle optional image update
    if (req.files?.image?.[0]) {
      const file = req.files.image[0];
      const up = await uploadBuffer(file.buffer, { folder: `services/${providerId}`, resource_type: "image" });
      service.image = { url: up.secure_url, publicId: up.public_id, width: up.width, height: up.height };
    }

    await service.save();
    res.json({ success: true, data: { service } });
  } catch (err) {
    next(err);
  }
};

/**
 * deleteService (soft delete)
 * DELETE /api/v1/services/:serviceId
 */
export const deleteService = async (req, res, next) => {
  try {
    const providerId = req.user?._id;
    const serviceId = req.params.serviceId;
    if (!providerId) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    if (!isValidId(serviceId)) return res.status(400).json({ success: false, error: { message: "Invalid service ID" } });

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, error: { message: "Service not found" } });

    // provider or admin can delete
    if (service.provider.toString() !== providerId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: { message: "Not authorized to delete" } });
    }

    service.isDeleted = true;
    await service.save();
    res.json({ success: true, data: { message: "Service deleted" } });
  } catch (err) {
    next(err);
  }
};

/**
 * reportService
 * POST /api/v1/services/:serviceId/report
 */
export const reportService = async (req, res, next) => {
  try {
    const reporter = req.user?._id;
    const serviceId = req.params.serviceId;
    const { reason = "other", details = "" } = req.body;

    if (!reporter) return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    if (!isValidId(serviceId)) return res.status(400).json({ success: false, error: { message: "Invalid service ID" } });

    const service = await Service.findById(serviceId).lean();
    if (!service) return res.status(404).json({ success: false, error: { message: "Service not found" } });

    // create a simple report doc if Report model present
    if (Report) {
      await Report.create({
        reportedBy: reporter,
        targetService: service._id,
        reason,
        details,
        status: "pending"
      });
    }

    res.json({ success: true, data: { message: "Report submitted" } });
  } catch (err) {
    next(err);
  }
};

/**
 * blockService (admin or community admin)
 * POST /api/v1/services/:serviceId/block
 * body: { action: "block" | "unblock" }
 */
export const blockService = async (req, res, next) => {
  try {
    const { action } = req.body;
    const serviceId = req.params.serviceId;

    if (!isValidId(serviceId)) return res.status(400).json({ success: false, error: { message: "Invalid service ID" } });

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, error: { message: "Service not found" } });

    // Allow global admin OR community admin of the service.community
    const isGlobalAdmin = req.user.role === "admin";
    const isCommunityAdmin = await CommunityMembership.findOne({
      user: req.user._id,
      community: service.community,
      role: { $in: ["admin", "owner"] },
      status_in_community: "active"
    });

    if (!isGlobalAdmin && !isCommunityAdmin) {
      return res.status(403).json({ success: false, error: { message: "Admin privileges required" } });
    }

    if (action === "block") {
      service.isActive = false;
      await service.save();
      return res.json({ success: true, data: { message: "Service blocked" } });
    } else if (action === "unblock") {
      service.isActive = true;
      await service.save();
      return res.json({ success: true, data: { message: "Service unblocked" } });
    } else {
      return res.status(400).json({ success: false, error: { message: "Invalid action" } });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * getFeedServices (Home)
 * GET /api/v1/services/feed
 * returns services from communities the user joined
 */
export const getFeedServices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    // 1. find joined communities
    const memberships = await CommunityMembership.find({ user: userId, status_in_community: "active" }).select("community");
    const communityIds = memberships.map((m) => m.community);

    if (!communityIds.length) {
      return res.json({ success: true, meta: { total: 0, page, limit }, data: [] });
    }

    const query = { community: { $in: communityIds }, isDeleted: false, isActive: true };
    if (req.query.category) query.category = req.query.category;
    if (req.query.available) query.available = req.query.available === "true";

    const total = await Service.countDocuments(query);
    const items = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("provider", "username firstName profilePic")
      .lean();

    res.json({ success: true, meta: { total, page, limit }, data: items });
  } catch (err) {
    next(err);
  }
};

/**
 * getMyServices (provider's own services)
 * GET /api/v1/services/me
 */
export const getMyServices = async (req, res, next) => {
  try {
    const providerId = req.user._id;
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const skip = (page - 1) * limit;

    const filter = { provider: providerId, isDeleted: false };
    const total = await Service.countDocuments(filter);
    const items = await Service.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    res.json({ success: true, meta: { total, page, limit }, data: items });
  } catch (err) {
    next(err);
  }
};
