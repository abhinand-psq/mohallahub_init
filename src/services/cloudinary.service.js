// src/services/cloudinary.service.js
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { logger } from "../config/logger.js";

export const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error: " + error.message);
          return reject(error);
        }
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// convenience helper to produce thumb urls
export const thumbUrl = (publicId, width = 200, options = {}) => {
  return cloudinary.url(publicId, { width, crop: "fill", ...options });
};
