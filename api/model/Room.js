const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    default: "",
  },

  roomName: {
    type: String,
    default: "",
  },
  roomLogo: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    default: "",
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
});

module.exports = mongoose.model("Room", roomSchema);
