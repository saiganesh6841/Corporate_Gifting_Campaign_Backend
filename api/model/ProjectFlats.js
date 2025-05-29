const mongoose = require("mongoose");

const floorSchema = new mongoose.Schema({
  flatNo: {
    type: Number,
    default: 0,
  },
  floorId: {
    type: mongoose.Schema.ObjectId,
    ref: "ProjectFloors",
  },
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
  },
  rooms: [
    {
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
      entries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Entry" }], // References to Entry model
    },
  ],
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

module.exports = mongoose.model("ProjectFlats", floorSchema);
