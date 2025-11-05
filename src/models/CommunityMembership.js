import mongoose from 'mongoose';
const { Schema } = mongoose;

const communityMembershipSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'moderator', 'member'], 
    default: 'member' 
  },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

communityMembershipSchema.index({ user: 1, community: 1 }, { unique: true });
communityMembershipSchema.index({ community: 1 });

export default mongoose.model('CommunityMembership', communityMembershipSchema);

