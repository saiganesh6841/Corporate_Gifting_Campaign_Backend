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
  userType: {
    type: String,
    default: "admin", // superadmin, hr, vendor, employee
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
    default: null,
  },
  tempOtp: {
    type: String,
    default: "",
  },
  otpExpiresAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  warehouseAddress: {
    type: String,
    default: "",
  },
  warehousePincode: {
    type: String,
    default: "",
  },
  // --- employee-specific fields ---
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null,
  },
  organizationName: {
    type: String,
    default: "",
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  employeeCode: {
    type: String,
    default: "",
  },
  department: {
    type: String,
    default: "",
  },
  designation: {
    type: String,
    default: "",
  },
  companyTagId: {
    type: String,
    default: "", // company-specific employee tag/badge ID
  },
  address: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  state: {
    type: String,
    default: "",
  },
  pincode: {
    type: String,
    default: "",
  },
  lastCampaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    default: null,
  },
  linkToken: {
    type: String,
    default: "",
  },
  tokenExpiresAt: {
    type: Number,
    default: 0,
  },
  // --- end employee-specific fields ---

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
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
userSchema.index({ email: 1 });
userSchema.index({ mobileNumber: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ hrId: 1 });
userSchema.index({ userType: 1 });

module.exports = mongoose.model("User", userSchema);
