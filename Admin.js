import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  status: String, // 'active' or 'suspended'
});

const AdminModel = mongoose.model('admins', AdminSchema);

export default AdminModel;
