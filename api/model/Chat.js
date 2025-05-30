const { ChangeStream } = require("mongodb");
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  chats: [
    {
      message: {
        type: String,
      },
      isAdminCreated: Boolean,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Number,
        default: () => Math.floor(Date.now() / 1000),
      },
    },
  ],
  //   file: [{ _id: false, name: String, url: String }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
});

messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
