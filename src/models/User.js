import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },

    // personal info
    firstName: { type: String, default: "" }, // optional (remove required)
    lastName: { type: String, default: "" },
    bio: { type: String, maxlength: 500 },

    refreshtoken: { type: String, default: null },
    resetPasswordToken: { type: String },
resetPasswordExpires: { type: Date },
    profilePic: {
      url: {type: String, default: "https://placehold.co/200x200.png"},
      publicId: {type: String, default: null},
      width: {type: Number, default: null},
      height: {type: Number, default: null},
    },
    coverPic: {
      url: {type: String, default: "https://placehold.co/600x200.png"},
      publicId: {type: String, default: null},
      width: {type: Number, default: null},
      height: {type: Number, default: null},
    },

    role: { type: String, enum: ["user", "admin","system"], default: "user" },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // linked location
    addressReference: {
      type: Schema.Types.ObjectId,
      ref: "UserCommunityAccess",
      default: null,
    },

    status: { type: String, enum: ["active", "banned"], default: "active" },

    stats: {
      postsCount: { type: Number, default: 0 },
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      communitiesJoined: { type: Number, default: 0 },
    },
    details:{type:String, default:function (){
      return `my name is ${this.firstName} ${this.lastName}`
    } }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

export default mongoose.model("User", userSchema);

