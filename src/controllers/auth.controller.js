// src/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";
import RefreshToken from "../models/RefreshToken.js";
import { uploadBuffer } from "../services/cloudinary.service.js";
import { signAccessToken, createRefreshToken, revokeRefreshToken } from "../services/token.service.js";
import crypto from "crypto";
import { sendResetEmail } from "../services/mail.service.js";

// Helpers
const saltRounds = 10;

export const register = async (req, res, next) => {
  try {
    // multipart: fields in req.body, files in req.files
    const { name, username, email, password, state, district, taluk, block, panchayath, ward } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, error: { message: "Missing fields" } });
    }
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ success: false, error: { message: "User exists" } });

    // Handle images
    let profilePicUrl = null;
    let profilePicId = null;
    let coverPicUrl = null;
    let coverPicId = null;

    if (req.files?.profilePic?.[0]) {
      const buf = req.files.profilePic[0].buffer;
      const result = await uploadBuffer(buf, { folder: `users/${email}`, resource_type: "image" });
      profilePicUrl = result.secure_url;
       profilePicId = result.public_id;
    }
   

if (req.files?.coverPic?.[0]) {
      const buf = req.files.coverPic[0].buffer;
      const result = await uploadBuffer(buf, { folder: `users/${email}`, resource_type: "image" });
      coverPicUrl = result.secure_url;
      coverPicId = result.public_id;
    }

    // ! have some issue on how works
    let uca = await UserCommunityAccess.findOne({ state, district, taluk, block, panchayath, ward });
    if (!uca) {
      uca = await UserCommunityAccess.create({ state, district, taluk, block, panchayath, ward });
    }

    // ? this is better  
    /*   actual uca thing 
    let uca = await UserCommunityAccess.findOne({ state, district, taluk, block, panchayath, ward })
    if(!uca){
    return res.status(400).json({ success: false, error: { message: "sorry location is not available in our database choose others" } });
    }
    */
    

    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      name, username, email: email.toLowerCase(), passwordHash,
      profilePic: profilePicUrl, coverPic: coverPicUrl, communityAccess: uca._id
    });

    // Tokens
    const accessToken = signAccessToken(user);

    //! refresh token is not created in way i wants change from crypto to jwt
    const refreshDoc = await createRefreshToken(user._id);

    // Set cookies
    res.cookie("mohalla_refresh", refreshDoc.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: (process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000
    });
    // Optionally set access cookie too
    res.cookie("mohalla_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000
    });

    res.status(201).json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, username: user.username }, accessToken } });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
    if (user.status === "banned") return res.status(403).json({ success: false, error: { message: "User banned" } });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });

    const accessToken = signAccessToken(user);
    //! refresh token is not created in way i wants change from crypto to jwt
    const refreshDoc = await createRefreshToken(user._id);

    res.cookie("mohalla_refresh", refreshDoc.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: (process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000
    });
    res.cookie("mohalla_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000
    });

    res.json({ success: true, data: { accessToken, user: { id: user._id, name: user.name, username: user.username } } });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.mohalla_refresh || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, error: { message: "Missing refresh token" } });

    const doc = await RefreshToken.findOne({ token });
    if (!doc) return res.status(401).json({ success: false, error: { message: "Invalid refresh token" } });
    if (doc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ token });
      return res.status(401).json({ success: false, error: { message: "Refresh token expired" } });
    }

    // rotate: delete old & create new
    await RefreshToken.deleteOne({ token });
    const newDoc = await createRefreshToken(doc.user);

    const user = await User.findById(doc.user);
    const accessToken = signAccessToken(user);

    // set cookie
    res.cookie("mohalla_refresh", newDoc.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: (process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000
    });
    res.cookie("mohalla_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000
    });

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.mohalla_refresh || req.body?.refreshToken;
    if (token) await revokeRefreshToken(token);
    res.clearCookie("mohalla_refresh");
    res.clearCookie("mohalla_access");
    res.json({ success: true, data: { message: "Logged out" } });
  } catch (err) {
    next(err);
  }
};

// Forgot & Reset (no email sending in this scaffold)
export const forgot = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: { message: "Email required" } });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ success: true, data: { message: "If account exists, reset token will be created" } });

    const token = crypto.randomBytes(24).toString("hex");
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // reset link
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset/${token}`;
    const mailResp = await sendResetEmail({ to: user.email, resetLink });

    // In dev mode return token for manual sending/testing
    if (process.env.DEV_MODE === "true") {
      return res.json({ success: true, data: { resetToken: token, mailResp } });
    }

    res.json({ success: true, data: { message: "Reset email queued" } });
  } catch (err) {
    next(err);
  }
};

export const reset = async (req, res, next) => {
  try {
    const token = req.params.token;
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, error: { message: "Invalid or expired token" } });

    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, error: { message: "New password required" } });
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ success: true, data: { message: "Password reset successful" } });
  } catch (err) {
    next(err);
  }
};
