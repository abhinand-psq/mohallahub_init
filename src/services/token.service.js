// src/services/token.service.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { logger } from "../config/logger.js";
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;

const ACCESS_EXP = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRES_DAYS || "7d";

// Create access token
export const createsignAccessToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    name: user.username,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXP });
};

// Create refresh token
export const createRefreshToken = (user) => {
  const payload = { sub: user._id.toString() };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
};

// Verify access token
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    logger.error("Invalid access token: " + err.message);
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    logger.error("Invalid refresh token: " + err.message);
    return null;
  }
};


export const createRandomToken = async (userId) => {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = Date.now() + (20*60*1000)
  return {token,expiresAt};
};