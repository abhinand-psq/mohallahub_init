// src/routes/admin.routes.js
import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import * as adminController from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/login", [ body("email").isEmail(), body("password").isLength({ min: 8 }) ], validateRequest, adminController.login);

router.use(authMiddleware, adminMiddleware); // protect below routes

router.get("/users", adminController.listUsers);
router.put("/users/:id/ban", adminController.banUser);
router.get("/communities", adminController.listCommunities);
router.delete("/communities/:id", adminController.deleteCommunity);
router.get("/reports", adminController.listReports);
router.put("/reports/:id", adminController.resolveReport);

export default router;
