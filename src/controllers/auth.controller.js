// src/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import UserCommunityAccess from "../models/UserCommunityAccess.js";
import { uploadBuffer } from "../services/cloudinary.service.js";
import { createsignAccessToken, createRefreshToken, verifyRefreshToken } from "../services/token.service.js";
import crypto from "crypto";
import { sendResetEmail } from "../services/mail.service.js";
import { createDefaultCommunity } from "../utils/CreateCommunity.js";
import dotenv from 'dotenv';
dotenv.config();
// Helpers
const saltRounds = 10;
const ObjectId = mongoose.Types.ObjectId;

export const register = async (req, res, next) => {



  try {
    let {
      firstName,
      lastName,
      username,
      email,
      password,
      state,
      district,
      taluk,
      block,
      panchayath,
      ward,
    } = req.body;

     if (state) state = state.trim().toLowerCase();
if (district) district = district.trim().toLowerCase();
if (taluk) taluk = taluk.trim().toLowerCase();
if (block) block = block.trim().toLowerCase();
if (panchayath) panchayath = panchayath.trim().toLowerCase();
if (ward) ward = ward.trim().toLowerCase();


    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: { message: "Missing required fields" } });
    }

    // check duplicates
    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) {
      return res.status(409).json({ success: false, error: { message: "User already exists" } });
    }


    

    // Atomically find or create UCA using upsert to avoid races
    const ucaFilter = {
      state,
      district,
      taluk,
      block,
      panchayath,
      ward,
    };

    const ucaUpdate = {
      $setOnInsert: {
        state:state,
        district,
        taluk,
        block,
         hierarchy: [state, district, taluk, block, panchayath, ward].filter(Boolean).join("-"),
        panchayath,
        ward,
        
      },
    };
    
    console.log("chck");
    console.log(ucaUpdate);
    

    let uca = await UserCommunityAccess.findOneAndUpdate(ucaFilter, ucaUpdate, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    if(!uca){
       return res.status(409).json({ success: false, error: { message: "error in finding or updating user communityacess" } });
    }
    // handle images (optional)
    let newprofilePic;
    let newcoverPic;

    if (req.files?.profilePic?.[0]) {
      const buf = req.files.profilePic[0].buffer;
      const uploaded = await uploadBuffer(buf, { folder: `users/${email.toLowerCase()}`, resource_type: "image" });
      newprofilePic = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height,
      };
    }

    if (req.files?.coverPic?.[0]) {
      const buf = req.files.coverPic[0].buffer;
      const uploaded = await uploadBuffer(buf, { folder: `users/${email.toLowerCase()}`, resource_type: "image" });
      newcoverPic = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height,
      };
    }

    // create user with saved uca._id
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userDoc = await User.create({
      firstName,
      lastName,
      username,
      email: email.toLowerCase(),
      passwordHash,
      profilePic: newprofilePic ? newprofilePic : undefined,
      coverPic: newcoverPic ? newcoverPic : undefined,
      addressReference: uca._id,
    });

    if(!userDoc){
       return res.status(409).json({ success: false, error: { message: "User can't create please try again later" } });
    }

    // tokens
    const newrefresh = createRefreshToken(userDoc);
    const accessToken = createsignAccessToken(userDoc);
    userDoc.refreshtoken = newrefresh;
    await userDoc.save();

  

    // Create default community (idempotent) and auto-join - non-blocking but we await to ensure membership exists
    try {
      await createDefaultCommunity(userDoc, uca._id, true);
    } catch (err) {
      // do NOT fail registration for community creation errors: log and continue
      console.error("createDefaultCommunity error:", err.message);
       return res.status(409).json({ success: false, error: { message: "createDefaultCommunity error",error:err.message } });
    }

    const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const accessMaxAge = 15 * 60 * 1000; // 15 minutes (you previously used 1 hour - adjust as required)

    res.cookie("mohalla_refresh", newrefresh, {
      httpOnly: true,
      secure:process.env.NODE_ENV == "production",
      sameSite:process.env.NODE_ENV == "production" && "None",
      maxAge: refreshMaxAge,
    });
    res.cookie("mohalla_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV == "production",
      sameSite:process.env.NODE_ENV == "production" && "None",
      maxAge: accessMaxAge,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userDoc._id,
          firstName: userDoc.firstName,
          lastName: userDoc.lastName,
          email: userDoc.email,
          username: userDoc.username,
        },
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// LOGIN
export const login = async (req, res, next) => {
  console.log('hello');
  try {
    const { email, password } =req.body;
    console.log(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
    }
    if (user.status === "banned") {
      return res.status(403).json({ success: false, error: { message: "User banned" } });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, error: { message: "Invalid credentials" } });
    }

    const accessToken = createsignAccessToken(user);
    const newrefresh = createRefreshToken(user);
    user.refreshtoken = newrefresh;
    await user.save();

 
  
    const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
const accessMaxAge = 1 * 60 * 60 * 1000; // 15 minutes

res.cookie("mohalla_refresh", newrefresh, {
  httpOnly: true,
  secure: process.env.NODE_ENV == "production",
  sameSite:process.env.NODE_ENV == "production" && "None",
  maxAge: refreshMaxAge,
});
res.cookie("mohalla_access", accessToken, {
  httpOnly: true,
  secure:process.env.NODE_ENV == "production",
  sameSite:process.env.NODE_ENV == "production" && "None",
  maxAge: accessMaxAge,
});
    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    });
  } catch (err) {
    console.log(err)
    next(err);
  }
};


export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.mohalla_refresh;
    if (!token)
      return res.status(401).json({ success: false, error: { message: "Missing refresh token" } });

    // Verify refresh token validity
    const decoded = verifyRefreshToken(token);
    if (!decoded)
      return res.status(401).json({ success: false, error: { message: "Invalid or expired refresh token" } });

    // Find user by stored refresh token
    const user = await User.findOne({ refreshtoken: token });
    if (!user)
      return res.status(401).json({ success: false, error: { message: "Token not recognized" } });

    if (user.status === "banned")
      return res.status(403).json({ success: false, error: { message: "User banned" } });

    // Rotate tokens
    const newRefresh = createRefreshToken(user);
    const newAccess = createsignAccessToken(user);

    user.refreshtoken = newRefresh;
    await user.save();

    // Set cookies
       const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
const accessMaxAge = 1 * 60 * 60 * 1000; // 15 minutes
    res.cookie("mohalla_refresh", newRefresh, {
      httpOnly: true,
      secure: true,
      maxAge: refreshMaxAge,
    });
    res.cookie("mohalla_access", newAccess, {
      httpOnly: true,
      secure:true,
      maxAge: accessMaxAge,
    });

    res.json({ success: true, data: { accessToken: newAccess } });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  const user = req.user;
 

  if(!user){
     return res.status(403).json({ success: false, error: { message: "User is not available" } });
  }
  try {
    await User.findOneAndUpdate({_id:user._id},{refreshtoken:""});
    const token = req.cookies?.mohalla_refresh || req.body?.refreshToken; 
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
    user.resetPasswordToken= hashed;
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

export const getMe = async (req, res, next) => {
  try {
    const user = req.user; // authMiddleware already sets req.user

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: "Unauthorized" }
      });
    }

    // populate addressReference (ucaRef)
    const populatedUser = await User.findById(user._id)
      .select("-passwordHash -refreshtoken -__v")
      // .populate("addressReference");

    res.json({
      success: true,
      data: populatedUser
    });
  } catch (error) {
    next(error);
  }
};

