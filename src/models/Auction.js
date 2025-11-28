import mongoose from "mongoose";
const { Schema } = mongoose;
const auctionSchema = new Schema(
  {
    community: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },

    images: {
    url: String,
    publicId: String,
  },

    startingPrice: { type: Number, required: true },
    minimumIncrement: { type: Number, default: 10 },

    currentHighestBid: { type: Number, default: null },
    currentHighestBidder: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    auctionStartTime: { type: Date, required: true },
    auctionEndTime: { type: Date, required: true },

    status: {
      type: String,
      enum: ["scheduled", "active", "closed", "cancelled"],
      default: "scheduled",
    },

    winner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    winningBid: { type: Number, default: null },

    bidCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Auction", auctionSchema);
