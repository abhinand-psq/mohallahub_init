import mongoose from "mongoose";
const { Schema } = mongoose;

const bidSchema = new Schema(
  {
    auction: {
      type: Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
    },
    bidder: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Bid", bidSchema);
