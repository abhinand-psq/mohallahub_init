import mongoose from 'mongoose';
const { Schema } = mongoose;

const communitySchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, maxlength: 500 },
  icon: {
    url: String,
    publicId: String
  },
  coverPic: {
    url: String,
    publicId: String
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hierarchy: { 
    type: String, 
    required: true 
  },
  // Denormalized fields for fast querying
  state: { type: String, required: true },
  district: { type: String, required: true },
  taluk: { type: String, required: true },
  block: { type: String, required: true },
  gramPanchayath: { type: String, required: true },
  wardNumber: { type: String, required: true },
  wardName: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  stats: {
    membersCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

communitySchema.index({ name: 1, hierarchy: 1 }, { unique: true });
communitySchema.index({ hierarchy: 1 });
communitySchema.index({ createdBy: 1 });

export default mongoose.model('Community', communitySchema);

