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
    type: Number,
    default: "",
  },
  endDate: { 
    type: Number,
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
  uploadImage: {
    type: String,
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
  isSupervisorAssigned: {
    type: Boolean,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "inprogress","cancelled"],
    default: "pending",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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

module.exports = mongoose.model("Project", projectSchema);
