import mongoose from 'mongoose';
const { Schema } = mongoose;

const mediaItemSchema = new Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  duration: { type: Number }, // For videos
  thumbnailUrl: { type: String }, // For videos (optional)
}, { _id: false });

const postSchema = new Schema({
   content: { type: String, maxlength: 5000, default: "" },
  media: [mediaItemSchema],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  rePostOf: { type: Schema.Types.ObjectId, ref: 'Post' }, // For reposts
  isSensitive: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  stats: {
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    repostsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
  },
}, { timestamps: true });

postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ rePostOf: 1 });

export default mongoose.model('Post', postSchema);
