const mongoose = require("mongoose");
const floorSchema = mongoose.Schema({
  floorId: {
    type: String,
    default: "",
  },
  floorNo: {
    type: Number,
    default: 0,
  },
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
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

module.exports = mongoose.model("ProjectFloors", floorSchema);
