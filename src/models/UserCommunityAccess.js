import mongoose from 'mongoose';
const { Schema } = mongoose;

const userCommunityAccessSchema = new Schema({
  state: { type: String, required: true },
  district: { type: String, required: true },
  taluk: { type: String, required: true },
  block: { type: String, required: true },
  panchayath: { type: String, required: true },
  ward: { type: String, required: true },
  hierarchy: { 
    type: String, 
    required: true,
    unique: true,
    default: function() {
      return `${this.state}-${this.district}-${this.taluk}-${this.block}-${this.panchayath}-${this.ward}`;
    }
  }
}, { timestamps: true });

userCommunityAccessSchema.index({ hierarchy: 1 }, { unique: true });

export default mongoose.model('UserCommunityAccess', userCommunityAccessSchema);

