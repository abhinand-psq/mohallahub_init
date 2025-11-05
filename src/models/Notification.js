import mongoose from 'mongoose';
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { 
    type: String, 
    enum: ['like', 'comment', 'repost', 'mention', 'follow', 'community_invite', 'admin_action'],
    required: true 
  },
  relatedPost: { type: Schema.Types.ObjectId, ref: 'Post' },
  relatedComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  relatedCommunity: { type: Schema.Types.ObjectId, ref: 'Community' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);


