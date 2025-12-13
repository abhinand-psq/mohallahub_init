// src/models/Product.js
import mongoose from "mongoose";
const { Schema } = mongoose;



const productSchema = new Schema({
  shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
  community: { type: Schema.Types.ObjectId, ref: "Community", required: true }, // denorm for quick queries
  seller: { type: Schema.Types.ObjectId, ref: "User", required: true },

  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },

  price: { type: Number, required: true },
  stock: { type: Number, default: 1 },

  category: { type: String, required: true }, // must be allowed by community/shop categories
  condition: { type: String, enum: ["new", "used","like_new","good","fair","poor"], required: true }, // required per your rule

  // For phase-1: single image only
  image: {
  url: { type: String, required: true },
  publicId: { type: String, required: true }
},

  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

productSchema.index({ shop: 1, community: 1 });
productSchema.index({ seller: 1 });

export default mongoose.model("Product", productSchema);
