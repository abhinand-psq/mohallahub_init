import mongoose from 'mongoose';
const { Schema } = mongoose;

const userCommunityAccessSchema = new Schema({
  state: { type: String, required: true },
  district: { type: String, required: true },
  taluk: { type: String, required: true },
  block: { type: String, required: true },
  gramPanchayath: { type: String, required: true },
  wardNumber: { type: String, required: true },
  wardName: { type: String, required: true },
  hierarchy: { 
    type: String, 
    required: true,
    unique: true,
    default: function() {
      return `${this.state}-${this.district}-${this.gramPanchayath}-${this.wardNumber}`;
    }
  }
}, { timestamps: true });

userCommunityAccessSchema.index({ hierarchy: 1 }, { unique: true });

export default mongoose.model('UserCommunityAccess', userCommunityAccessSchema);

