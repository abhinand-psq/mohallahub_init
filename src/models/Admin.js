import mongoose from 'mongoose';
const { Schema } = mongoose;

const adminSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

adminSchema.index({ email: 1 }, { unique: true });

export default mongoose.model('Admin', adminSchema);


