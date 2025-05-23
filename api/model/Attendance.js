const mongoose = require("mongoose");

const AttendanceSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    attendanceDate: {
      type: String,
      required: true,
    },
    checkIn: {
      type: Number,
      default: () => Math.floor(Date.now() / 1000),
    },
    checkOut: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    totalDuration: {
      type: String,
      default: "0h 0m",
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Number,
      default: () => Math.floor(Date.now() / 1000),
    },
  },
);

module.exports = mongoose.model("Attendance", AttendanceSchema);
