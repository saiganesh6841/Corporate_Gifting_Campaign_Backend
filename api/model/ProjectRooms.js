const mongoose = require("mongoose");
const imageSchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    name: { type: String, default: "" },
    url: { type: String, required: true },
  },
  { _id: false }
);
const floorSchema = mongoose.Schema({
  roomId: {
    type: mongoose.Schema.ObjectId,
    ref: "Room",
  },
  floorId: {
    type: mongoose.Schema.ObjectId,
    ref: "ProjectFloors",
  },
  flatId: {
    type: mongoose.Schema.ObjectId,
    ref: "ProjectFlats",
  },
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
  },
  roomImages: {
    type: [imageSchema],
    default: [],
  },
  active: {
    type: Boolean,
    default: true,
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

module.exports = mongoose.model("ProjectRooms", floorSchema);
