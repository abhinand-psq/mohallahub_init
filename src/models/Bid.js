import mongoose from "mongoose";
const { Schema } = mongoose;

const bidSchema = new Schema(
  {
    auction: {
      type: Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },

    bidder: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Prevent same user placing the same amount twice in the same auction
 * (not strictly required, but helpful)
 */
bidSchema.index(
  { auction: 1, bidder: 1, amount: 1 },
  { unique: true }
);

export default mongoose.model("Bid", bidSchema);
