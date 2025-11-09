import mongoose from 'mongoose';
const { Schema } = mongoose;

const mediaItemSchema = new Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  duration: { type: Number },
  thumbnailUrl: { type: String }
}, { _id: false });

const commentSchema = new Schema({
  content: { type: String, required: true, maxlength: 2000 },
  media: [mediaItemSchema],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' }, // For threaded comments
  isDeleted: { type: Boolean, default: false },
  stats: {
    likesCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

export default mongoose.model('Comment', commentSchema);



