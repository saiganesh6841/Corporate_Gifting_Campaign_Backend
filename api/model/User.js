const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: "",
  },
  fullName: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  mobileNumber: {
    type: String,
    default: "",
  },
  password: {
    type: String,
    default: "",
  },
  tempOtp: {
    type: String,
    default: "",
  },
  userType: {
    type: String,
    default: "worker", //worker, admin, superviser
  },
  active: {
    type: Boolean,
    default: true,
  },
  profileImage: {
    type: String,
    default: "",
  },
  gender: {
    type: String,
    default: "",
  },
  dob: {
    type: String,
    default: "",
  },
  passwordAttempt: {
    type: Number,
    default: 0,
  },
  lastLogin: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  permission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  createdAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
});

userSchema.index({ userId: 1 });

module.exports = mongoose.model("User", userSchema);
