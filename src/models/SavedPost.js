import mongoose from 'mongoose';
const { Schema } = mongoose;

const savedPostSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true }
}, { timestamps: true });

savedPostSchema.index({ user: 1, post: 1 }, { unique: true });
savedPostSchema.index({ user: 1 });

export default mongoose.model('SavedPost', savedPostSchema);



