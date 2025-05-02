import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "User" },
  status: { type: String, enum: ["Active", "Inactive", "Suspended"], default: "Active" },
  lastLogin: { type: Date, default: Date.now },
}, { timestamps: true });

const UserModel = mongoose.model('User', userSchema);
export default UserModel;
