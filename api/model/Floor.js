const mongoose = require("mongoose");
const floorSchema = mongoose.Schema(
    {
        floorNo: {
            type: Number,
            default: 1,
        },
        projectId: {
            type: mongoose.Schema.ObjectId,
            ref: "Project",
        },
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
    },
    {
        collection: "floors",
    }
);

module.exports = mongoose.model("Floor", floorSchema);
