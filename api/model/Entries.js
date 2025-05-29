const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    name: { type: String, default: "" },
    url: { type: String, required: true },
  },
  { _id: false }
);

const entrySchema = new mongoose.Schema({
  roomImages: [imageSchema],
  notes: String,
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  createdAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  isTask: Boolean,
  uploadId: { type: String },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectFlats" },
});

module.exports = mongoose.model("Entry", entrySchema);
