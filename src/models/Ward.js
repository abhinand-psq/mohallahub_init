import mongoose from 'mongoose';
const { Schema } = mongoose;

const wardSchema = new Schema({
  state: { type: String, required: true },
  district: { type: String, required: true },
  taluk: { type: String, required: true },
  block: { type: String, required: true },
  gramPanchayath: { type: String, required: true },
  wardNumber: { type: String, required: true },
  wardName: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, { timestamps: true });

wardSchema.index({ state: 1, district: 1, gramPanchayath: 1, wardNumber: 1 }, { unique: true });
wardSchema.index({ location: '2dsphere' });

export default mongoose.model('Ward', wardSchema);

