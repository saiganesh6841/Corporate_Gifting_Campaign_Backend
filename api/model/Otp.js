const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  otp: {
    type: "string",
    default: "",
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"User"
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

module.exports= mongoose.model("Otp",otpSchema);
