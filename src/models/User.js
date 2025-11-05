import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  bio: { type: String, maxlength: 500 },
  profilePic: { 
    url: String,
    publicId: String,
    width: Number,
    height: Number
  },
  coverPic: {
    url: String,
    publicId: String,
    width: Number,
    height: Number
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  addressReference: { 
    type: Schema.Types.ObjectId, 
    ref: 'UserCommunityAccess',
    default: null 
  },
  stats: {
    postsCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    communitiesJoined: { type: Number, default: 0 }
  }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

export default mongoose.model('User', userSchema);

