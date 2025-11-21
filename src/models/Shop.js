// src/models/Shop.js
import mongoose from "mongoose";
const { Schema } = mongoose;



const shopSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, index: true }, // optional friendly id
  community: { type: Schema.Types.ObjectId, ref: "Community", required: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

  description: { type: String, default: "" },

  categories: [{ type: String }], // seller categories, must be subset of community.allowedMarketplaceCategories

  logo:{url:{ type: String, default: null },publicId: { type: String, default: null }},
  banner: {url:{ type: String, default: null },publicId: { type: String, default: null }},

  isActive: { type: Boolean, default: true },      // owner can pause shop
  isApproved: { type: Boolean, default: true },    // future: community admin can require approval

  stats: {
    productCount: { type: Number, default: 0 },
  }
}, { timestamps: true });

shopSchema.index({ owner: 1, community: 1 }, { unique: true }); // one shop per user per community
shopSchema.index({ community: 1 });

export default mongoose.model("Shop", shopSchema);
