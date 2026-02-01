import express from "express";
import { reverseGeocode } from "../controllers/location.controller.js";

const router = express.Router();

// Signup-only auto location
router.get("/reverse", reverseGeocode);

export default router;
