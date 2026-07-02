const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    default: "",
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  vendorName: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  sku: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  shortDescription: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    default: "",
  },
  subCategory: {
    type: String,
    default: "",
  },
  brand: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    default: 0,
  },
  discountPrice: {
    type: Number,
    default: 0,
  },
  discountPercentage: {
    type: Number,
    default: 0,
  },
  gstPercentage: {
    type: Number,
    default: 0,
  },
  images: {
    type: [String],
    default: [],
  },
  thumbnailImage: {
    type: String,
    default: "",
  },
  stockQuantity: {
    type: Number,
    default: 0,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
  },
  tags: {
    type: [String],
    default: [],
  },
  occasions: {
    type: [String],
    default: [], // diwali, christmas, eid, birthday, leadership, etc.
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
  },
  maxOrderQuantity: {
    type: Number,
    default: 0, // 0 = no limit
  },
  weight: {
    type: Number,
    default: 0, // in grams, useful for courier weight slabs
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  rating: {
    type: Number,
    default: 0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  totalSold: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  approvalStatus: {
    type: String,
    default: "pending", // pending, approved, rejected -> useful since SuperAdmin may want to vet vendor-uploaded products
  },
  rejectionReason: {
    type: String,
    default: "",
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

productSchema.index({ productId: 1 });
productSchema.index({ vendor: 1 });
productSchema.index({ active: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: "text" });

module.exports = mongoose.model("Product", productSchema);
