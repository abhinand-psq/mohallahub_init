import User from "../models/User.js";
import { createRefreshToken, createsignAccessToken } from "../services/token.service.js";
import bcrypt from "bcryptjs";



export const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const adminUser = await User.findOne({
      username,
      role: "system",
      isActive: true
    });

    if (!adminUser) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const match = await bcrypt.compare(password, adminUser.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const adminAccessToken = createsignAccessToken(adminUser, {
      scope: "admin"
    });
    const adminRefreshToken = createRefreshToken(adminUser, {
      scope: "admin"
    });

    adminUser.refreshtoken = adminRefreshToken;
    await adminUser.save();

    // 🔑 ADMIN COOKIES (SEPARATE)
    res.cookie("mohalla_admin_access", adminAccessToken, {
      httpOnly: true,
      sameSite: "strict",
    });

    res.cookie("mohalla_admin_refresh", adminRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
    });

    res.json({
      success: true,
      message: "Admin login successful"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: "Admin login failed" } });
  }
};
