// src/routes/services.routes.js
import express from "express";
import multer from "multer";
import { body } from "express-validator";
import validateRequest from "../middleware/validateRequest.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as servicesController from "../controllers/services.controller.js";

const upload = multer();

const router = express.Router();

/**
 * Community-level endpoints
 */
router.post(
  "/communities/:communityId/services",
  authMiddleware,
   upload.fields([{ name: "image", maxCount: 1 }]),
  [
    body("title").isLength({ min: 2 }),
    body("category").isString().notEmpty(),
    body("priceMin").isNumeric(),
    body("priceMax").isNumeric(),
    body("phone").isString().notEmpty()
  ],
  validateRequest,
  servicesController.createService
);

router.get("/communities/:communityId/services", authMiddleware, servicesController.listServicesInCommunity);

/**
 * Global / service-centric endpoints
 */
router.get("/services/feed", authMiddleware, servicesController.getFeedServices);
router.get("/services/me", authMiddleware, servicesController.getMyServices);
router.get("/services/:serviceId", authMiddleware, servicesController.getService);
router.put("/services/:serviceId", authMiddleware, upload.single("image"), servicesController.updateService);
router.delete("/services/:serviceId", authMiddleware, servicesController.deleteService);

/**
 * Moderation & reporting
 */
router.post("/services/:serviceId/report", authMiddleware, servicesController.reportService);
router.post("/services/:serviceId/block", authMiddleware, servicesController.blockService);

export default router;
