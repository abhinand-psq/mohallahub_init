import mongoose from 'mongoose';
const { Schema } = mongoose;

const reportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['post', 'comment', 'user', 'community'],
    required: true 
  },
  reportedPost: { type: Schema.Types.ObjectId, ref: 'Post' },
  reportedComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  reportedUser: { type: Schema.Types.ObjectId, ref: 'User' },
  reportedCommunity: { type: Schema.Types.ObjectId, ref: 'Community' },
  reason: { 
    type: String, 
    enum: ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'],
    required: true 
  },
  description: { type: String, maxlength: 500 },
  status: { 
    type: String, 
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'], 
    default: 'pending' 
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);


