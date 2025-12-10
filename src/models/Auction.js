import mongoose from "mongoose";
const { Schema } = mongoose;

const auctionSchema = new Schema(
  {
    // 🔗 Relations
    community: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 📦 Item details
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    image: {
      url: { type: String },
      publicId: { type: String },
    },

    // 💰 Auction rules
    startingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    minimumBidIncrement: {
      type: Number,
      default: 1,
      min: 1,
    },

    // ⏱ Time (SOURCE OF TRUTH)
    auctionStartTime: {
      type: Date,
      required: true,
      index: true,
    },

    auctionEndTime: {
      type: Date,
      required: true,
      index: true,
    },

    // 🏁 Winner (set MANUALLY now, automation later)
    winningBid: {
      type: Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },

    winner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 🔒 Hard stop flag (admin/manual close)
    isClosed: {
      type: Boolean,
      default: false,
    },

    // 🧮 Stats (optimized reads)
    stats: {
      bidCount: { type: Number, default: 0 },
      highestBidAmount: { type: Number, default: 0 },
    },

    // 🛡 Moderation
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

//
// ✅ VALIDATION: end time must be AFTER start time
//
auctionSchema.pre("validate", function (next) {
  if (this.auctionEndTime <= this.auctionStartTime) {
    return next(new Error("Auction end time must be after start time"));
  }
  next();
});

export default mongoose.model("Auction", auctionSchema);
