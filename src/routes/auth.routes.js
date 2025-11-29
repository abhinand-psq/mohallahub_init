// src/routes/auth.routes.js
import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { upload } from "../middleware/uploadMiddleware.js";
import * as authController from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// multipart signup: use fields names 'profilePic' and 'coverPic'
router.post("/signup", upload.fields([{ name: "profilePic", maxCount: 1 }, { name: "coverPic", maxCount: 1 }]), authController.register);

// login
//  "email": "arjunmen3on@example.com","password": "Secur3e@123",
router.post("/login",  authController.login);

// refresh
router.post("/refresh", authController.refresh);

// logout
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.getMe);
// forgot/reset
router.post("/forgot", [ body("email").isEmail() ], validateRequest, authController.forgot);
router.post("/reset/:token", [ body("newPassword").isLength({ min: 8 }) ], validateRequest, authController.reset);

export default router;
