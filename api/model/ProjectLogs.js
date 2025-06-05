const mongoose = require("mongoose");

const projectLogSchema = new mongoose.Schema({
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  changes: [
    {
      _id: false,
      field: { type: String },
      message: { type: String },
    },
  ],
  changeBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  updatedAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
});

module.exports = mongoose.model("projectLogs", projectLogSchema);
