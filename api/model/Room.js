const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    name: { type: String, default: "" },
    url: { type: String, required: true },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    default: "",
  },
  floorId: {
    type: mongoose.Schema.ObjectId,
    ref: "Floor",
  },
  description: {
    type: String,
    default: "",
  },
  roomIcon: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    default: "",
  },
  imageUrls: {
    type: [imageSchema],
    default: [],
  },
  createdAt: {
    type: Number,
    default: Math.floor(Date.now() / 1000),
  },
  updatedAt: {
    type: Number,
    default: Math.floor(Date.now() / 1000),
  },
});

module.exports = mongoose.model("Room", roomSchema);
