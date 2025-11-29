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

  logo:{publicId:{ type: String, default: null },url: { type: String, default: "https://img.freepik.com/premium-vector/modern-shopping-bag-logo-design-with-slogan-placeholder-minimalist-style_906185-1003.jpg" }},
  banner: {publicId:{ type: String, default: null },url: { type: String, default: "https://img.freepik.com/premium-vector/flat-promotion-original-banner-sales-background-price-tag_151170-1444.jpg" }},

  isActive: { type: Boolean, default: true },      // owner can pause shop
  isApproved: { type: Boolean, default: true },    // future: community admin can require approval

  stats: {
    productCount: { type: Number, default: 0 },
  }
}, { timestamps: true });

shopSchema.index({ owner: 1, community: 1 }, { unique: true }); // one shop per user per community
shopSchema.index({ community: 1 });

export default mongoose.model("Shop", shopSchema);
