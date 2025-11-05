// src/middleware/validateRequest.js
import { validationResult } from "express-validator";

export default function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Validation failed", details: errors.array() }
    });
  }
  next();
}
