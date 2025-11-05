import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { logger } from "../config/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const authMiddleware = async (req, res, next) => {
  try {
    // Accept either Authorization header or cookie
    let token = null;
    const auth = req?.headers?.authorization;
    if (auth && auth.startsWith("Bearer ")) token = auth?.split(" ")?.[1];

    if (!token && req.cookies?.mohalla_access) token = req.cookies?.mohalla_access;

    if (!token) {
      req.user = null;
      return res.status(401).json({ success: false, error: { message: "Not authenticated" } });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ success: false, error: { message: "User not found" } });

    req.user = user;
    next();
  } catch (err) {
    logger.error("Auth middleware error: " + (err.message || err));
    return res.status(401).json({ success: false, error: { message: "Invalid or expired token" } });
  }
};
