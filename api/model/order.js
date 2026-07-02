const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    default: "",
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // snapshot product details at time of order
  productSnapshot: {
    name: { type: String, default: "" },
    price: { type: Number, default: 0 },
    discountPrice: { type: Number, default: 0 },
    thumbnailImage: { type: String, default: "" },
  },
  // delivery address snapshot — stored directly, no separate model
  deliveryAddress: {
    fullName: { type: String, default: "" },
    mobileNumber: { type: String, default: "" },
    addressLine: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    landmark: { type: String, default: "" },
  },
  quantity: {
    type: Number,
    default: 1,
  },
  price: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: "pending", // pending, processing, shipped, delivered, cancelled
  },
  awb: {
    type: String,
    default: "",
  },
  courier: {
    type: String,
    default: "",
  },
  trackingHistory: {
    type: [
      {
        status: { type: String, default: "" },
        location: { type: String, default: "" },
        remarks: { type: String, default: "" },
        timestamp: { type: Number, default: 0 },
      },
    ],
    default: [],
  },
  expectedDeliveryDate: {
    type: Number,
    default: 0,
  },
  deliveredAt: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
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

orderSchema.index({ orderId: 1 });
orderSchema.index({ campaign: 1 });
orderSchema.index({ employee: 1 });
orderSchema.index({ organization: 1 });
orderSchema.index({ vendor: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);
