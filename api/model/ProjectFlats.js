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
  // flatId: {
  //   type: String,
  //   default: "",
  // },
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
      entries: [
        {
          roomImages: [imageSchema],
          notes: String,
          workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        },
      ],
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
