
import mongoose from 'mongoose';
const { Schema } = mongoose;

const communitySchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, maxlength: 500 },
  icon: {
    url:{
      type: String,
    default:'https://placehold.co/100x100.png'
    },
      IconId: {type: String  , default:null},
  },

  banner: {
    url:{
      type: String,
    default:'https://placehold.co/600x200.png'
    },
  BannerId: {type: String  , default:null},
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ucaRef: { type: Schema.Types.ObjectId, ref: "UserCommunityAccess", required: true },
  allowedMarketplaceCategories: [String],///
  // Denormalized fields for fast querying
  state: { type: String, required: true },
  district: { type: String, required: true },
  taluk: { type: String, required: true },
  block: { type: String, required: true },
  panchayath: { type: String, required: true },
  ward: { type: String, required: true },
  isPrivate: { type:String, enum: ["public", "private", "restricted"], default: "public" },
  isActive: { type: Boolean, default: true },
  hierarchy: { 
    type: String, 
    required: true,
    default:"",
  },
  isDefault: {
    type: Boolean,
    default: false,
  },

  stats: {
    membersCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 }
  }
}, { timestamps: true });


communitySchema.index({ hierarchy: 1 });
communitySchema.index({ createdBy: 1 });
communitySchema.index(
  { ucaRef: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);



export default mongoose.model('Community', communitySchema);

