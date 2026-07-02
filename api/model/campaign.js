const mongoose = require("mongoose");

const campaignProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  name: { type: String, default: "" },
  description: { type: String, default: "" },
  category: { type: String, default: "" },
  brand: { type: String, default: "" },
  price: { type: Number, default: 0 },
  vendorName: { type: String, default: "" },
  discountPrice: { type: Number, default: 0 },
  thumbnailImage: { type: String, default: "" },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const campaignSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    default: "",
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  campaignName: {
    type: String,
    default: "",
  },
  occasion: {
    type: String,
    default: "",
  },
  budgetPerEmployee: {
    type: Number,
    default: 0,
  },
  deliveryWindowStart: {
    type: Number,
    default: 0,
  },
  deliveryWindowEnd: {
    type: Number,
    default: 0,
  },
  campaignDeadline: {
    type: Number,
    default: 0,
  },
  giftingModel: {
    type: String,
    default: "hr_selected", // hr_selected, employee_choice
  },
  emailTextInformation: {
    type: String,
    default: "", // stores base64 encoded HTML from ReactQuill
  },
  message: {
    type: String,
    default: "",
  },
  // products HR selected — one for hr_selected model, multiple for employee_choice
  products: {
    type: [campaignProductSchema],
    default: [],
  },
  totalEmployees: {
    type: Number,
    default: 0,
  },
  giftsSelected: {
    type: Number,
    default: 0,
  },
  ordersShipped: {
    type: Number,
    default: 0,
  },
  deliveredOrders: {
    type: Number,
    default: 0,
  },
  employeeFile: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    default: "draft", // draft, active, completed, cancelled
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

campaignSchema.index({ campaignId: 1 });
campaignSchema.index({ organization: 1 });
campaignSchema.index({ hr: 1 });
campaignSchema.index({ status: 1 });

module.exports = mongoose.model("Campaign", campaignSchema);
