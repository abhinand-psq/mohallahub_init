// src/services/token.service.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";
import { logger } from "../config/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXP = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "7", 10);

export const signAccessToken = (user) => {
  const payload = { sub: user._id.toString(), role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXP });
};

export const createRefreshToken = async (userId) => {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  const doc = await RefreshToken.create({ user: userId, token, expiresAt });
  return doc;
};

export const revokeRefreshToken = async (token) => {
  try {
    await RefreshToken.deleteOne({ token });
  } catch (err) {
    logger.error("Failed to revoke refresh token: " + err.message);
  }
};

export const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);
