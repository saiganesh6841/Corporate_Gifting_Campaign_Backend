const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  scheduleId: {
    type: String,
    default: "",
  },
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
  },
  checkIn: {
    type: Number,
  },
  checkOut: {
    type: Number,
  },
  totalHours: {
    type: String,
  },
  createdAt: {
    type: Number,
    default: Math.floor(Date.now() / 1000),
  },
  updatedAt: {
    type: Number,
    default: Math.floor(Date.now() / 1000),
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  active: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Schedule", roomSchema);
