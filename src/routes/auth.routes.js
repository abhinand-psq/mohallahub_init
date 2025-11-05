// src/routes/auth.routes.js
import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { upload } from "../middleware/uploadMiddleware.js";
import * as authController from "../controllers/auth.controller.js";

const router = express.Router();

// multipart signup: use fields names 'profilePic' and 'coverPic'
router.post("/signup", upload.fields([{ name: "profilePic", maxCount: 1 }, { name: "coverPic", maxCount: 1 }]), authController.register);

// login
router.post("/login", [ body("email").isEmail(), body("password").isLength({ min: 8 }) ], validateRequest, authController.login);

// refresh
router.post("/refresh", authController.refresh);

// logout
router.post("/logout", authController.logout);

// forgot/reset
router.post("/forgot", [ body("email").isEmail() ], validateRequest, authController.forgot);
router.post("/reset/:token", [ body("newPassword").isLength({ min: 8 }) ], validateRequest, authController.reset);

export default router;
