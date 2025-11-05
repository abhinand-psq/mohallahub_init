import mongoose from 'mongoose';
const { Schema } = mongoose;

const followSchema = new Schema({
  follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ follower: 1 });
followSchema.index({ following: 1 });

export default mongoose.model('Follow', followSchema);


