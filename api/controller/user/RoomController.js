const User = require("../../model/User");
const Task = require("../../model/Task");
const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");
const Flat = require("../../model/ProjectFlats");

module.exports = {
  taskDetails: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { flatId, roomId, status } = req.body;

      const flatObjectId = await UtilController.convertToMongoose(flatId);
      const roomObjectId = await UtilController.convertToMongoose(roomId);

      const matchFilter = {
        flatNo: flatObjectId,
        room: roomObjectId,
        taskStatus: status || "pending",
      };

      const pipeline = [
        {
          $match: matchFilter,
        },
        {
          $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDetails",
          },
        },
        {
          $unwind: {
            path: "$projectDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "projectDetails.assignedSupervisor",
            foreignField: "_id",
            as: "assignedSupervisor",
          },
        },
        {
          $unwind: {
            path: "$assignedSupervisor",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      // If the **status is completed**, add the flatDetails lookup
      if (status === "completed") {
        pipeline.push(
          {
            $lookup: {
              from: "projectflats",
              localField: "flatNo",
              foreignField: "_id",
              as: "flatDetails",
            },
          },
          {
            $unwind: {
              path: "$flatDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              "flatDetails.rooms": {
                $filter: {
                  input: "$flatDetails.rooms",
                  as: "room",
                  cond: { $eq: ["$$room.roomId", roomObjectId] },
                },
              },
            },
          }
        );
      }

      // Final $project stage
      const projectStage = {
        $project: {
          _id: 1,
          taskName: 1,
          taskDescription: 1,
          status: 1,
          createdAt: 1,
          taskId: 1,
          supervisorName: "$assignedSupervisor.fullName",
          supervisorId: "$assignedSupervisor._id",
        },
      };

      // Only add roomDetails if status is completed
      if (status === "completed") {
        projectStage.$project.roomDetails = "$flatDetails.rooms";
      }

      pipeline.push(projectStage);

      const result = await Task.aggregate(pipeline);

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks fetched successfully",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },

  submitTask: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { taskId, imageUrls, notes } = req.body;

      const taskResult = await Task.findById(taskId);

      const updateRooms = await Flat.findByIdAndUpdate(
        { _id: taskResult.flatNo },
        {
          $set: {
            "rooms.$[elem].roomImages": imageUrls,
            "rooms.$[elem].notes": notes,
          },
        },
        {
          arrayFilters: [{ "elem.roomId": taskResult.room }],
          new: true,
        }
      );

      await Task.findByIdAndUpdate(taskId, {
        $set: {
          taskStatus: "completed",
        },
      });

      return UtilController.sendSuccess(req, res, next, {
        message: "successfully submitted the task",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },
};
