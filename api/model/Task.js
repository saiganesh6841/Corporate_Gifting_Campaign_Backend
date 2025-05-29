const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    default: "",
  },
  taskDescription: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  floorNo: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ProjectFloors",
  },
  flatNo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProjectFlats",
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },
  taskStatus: {
    type: String,
    enum: ["pending", "in-progress", "completed"],
    default: "pending",
  },
  updatedAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  createdAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  active: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Task", taskSchema);
