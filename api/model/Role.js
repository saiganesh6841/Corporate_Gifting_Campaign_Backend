const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: String,
  active: {
    type: Boolean,
    default: true,
  },
  permission: [
    {
      label: {
        type: String,
        required: true,
      },
      enable: {
        type: Boolean,
        required: true,
      },
      buttons: [
        {
          label: {
            type: String,
            required: true,
          },
          enable: {
            type: Boolean,
            required: true,
          },
        },
      ],
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
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

module.exports = mongoose.model("Role", roleSchema);
