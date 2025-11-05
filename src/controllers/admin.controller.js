// src/controllers/admin.controller.js
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Community from "../models/Community.js";
import Report from "../models/Report.js";
import bcrypt from "bcryptjs";
import { signAccessToken, createRefreshToken } from "../services/token.service.js";

// admin login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });

    const accessToken = signAccessToken({ _id: admin._id, role: "admin" });
    const refreshDoc = await createRefreshToken(admin._id);

    res.cookie("mohalla_refresh", refreshDoc.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "Strict" });
    res.cookie("mohalla_access", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "Strict" });

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const total = await User.countDocuments(filter);
    const items = await User.find(filter).skip(skip).limit(parseInt(limit)).select("-passwordHash");
    res.json({ success: true, meta: { total, page: parseInt(page), limit: parseInt(limit) }, data: items });
  } catch (err) {
    next(err);
  }
};

export const banUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: "banned" }, { new: true }).select("-passwordHash");
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

export const listCommunities = async (req, res, next) => {
  try {
    const items = await Community.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

export const deleteCommunity = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Community.findByIdAndUpdate(id, { isDeleted: true });
    res.json({ success: true, data: { message: "Community soft-deleted" } });
  } catch (err) {
    next(err);
  }
};

export const listReports = async (req, res, next) => {
  try {
    const items = await Report.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // e.g., 'resolve', 'banUser', 'deletePost'
    const report = await Report.findByIdAndUpdate(id, { status: "reviewed", reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};
