let mongoose = require("mongoose");

let tagSchema = mongoose.Schema({
  tagType: {
    type: String,
    default: "",
  },
  prefix: {
    type: String,
    default: "",
  },
  sequenceNo: {
    // this is the continuous number to track and needs to do auto increment
    type: Number,
  },
  active: {
    type: Boolean,
    default: true,
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
const collectionName = "tags";
module.exports = mongoose.model("Tag", tagSchema, collectionName);