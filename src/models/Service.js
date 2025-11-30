// src/models/Service.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const serviceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // category must be one of community.allowedMarketplaceCategories (validated in controller)
    category: { type: String, required: true },

    // Price range
    priceMin: { type: Number, required: true },
    priceMax: { type: Number, required: true },

    // provider + community + ucaRef for locality
    provider: { type: Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: Schema.Types.ObjectId, ref: "Community", required: true },
    ucaRef: { type: Schema.Types.ObjectId, ref: "UserCommunityAccess", required: true },

    // contact
    phone: { type: String, required: true },

    // single image
    image: {
      url: { type: String },
      publicId: { type: String },
      width: { type: Number },
      height: { type: Number }
    },

    // availability toggle
    available: { type: Boolean, default: true },

    // moderation & soft delete
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    // statistics
    stats: {
      views: { type: Number, default: 0 },
      inquiries: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Indexes for fast feed queries
serviceSchema.index({ community: 1, createdAt: -1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ category: 1 });

export default mongoose.model("Service", serviceSchema);
