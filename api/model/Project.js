const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    default: "",
  },
  projectName: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: true,
  },
  location: {
    type: String,
    default: "",
  },
  clientName: {
    type: String,
    default: "",
  },
  companyName: {
    type: String,
    default: "",
  },
  startDate: {
    type: String,
    default: "",
  },
  endDate: {
    type: String,
    default: "",
  },
  clientPhoneNo: {
    type: String,
    default: "",
  },
  clientEmail: {
    type: String,
    default: "",
  },
  assignedWorkers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  assignedSupervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isWorkerAssigned: {
    type: Boolean,
  },
  isSuperAssigned: {
    type: Boolean,
  },

  rooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
  ],
  createdAt: {
    type: Number,
    default: Math.floor(Date.now() / 1000),
  },
  updatedAt: {
    type: Number,
    default: Math.floor(Date.now() / 1000),
  },
});

module.exports = mongoose.model("Project", projectSchema);
