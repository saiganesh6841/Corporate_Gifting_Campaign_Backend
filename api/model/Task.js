const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    default: "",
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  floor: {
    type: String,
    default: "",
  },
  room: {
    type: String,
    default: "",
  },
  task: [
    {
      taskId: {
        type: String,
        default: "",
      },
      taskDescription: {
        type: String,
        default: "",
      },
    },
  ],
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
});

module.exports = mongoose.model("Task", taskSchema);
