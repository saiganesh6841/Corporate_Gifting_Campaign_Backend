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
  floor: {
    type: String,
    default: "",
  },
  description: {
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
});

module.exports = mongoose.model("Room", roomSchema);
