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
              $map: {
                input: {
                  $filter: {
                    input: "$flatDetails.rooms",
                    as: "room",
                    cond: { $eq: ["$$room.roomId", roomObjectId] },
                  },
                },
                as: "room",
                in: {
                  roomId: "$$room.roomId",
                  entries: {
                    $filter: {
                      input: "$$room.entries",
                      as: "entry",
                      cond: { $eq: ["$$entry.taskId", "$_id"] }, // Filter entries by taskId
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            taskName: 1,
            taskDescription: 1,
            status: 1,
            createdAt: 1,
            taskId: 1,
            supervisorName: "$assignedSupervisor.fullName",
            supervisorImage: "$assignedSupervisor.profileImage",
            supervisorId: "$assignedSupervisor._id",
            roomDetails: "$flatDetails.rooms",
          },
        },
      ];

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

      if (!taskResult) {
        return UtilController.sendError(req, res, next, {
          message: "Task not found",
          responseCode: returnCode.validationError,
        });
      }

      // Look for existing entry

      const updateExistingEntry = await Flat.updateOne(
        {
          _id: taskResult.flatNo,
          "rooms.roomId": taskResult.room,
          "rooms.entries.taskId": taskId,
        },
        {
          $set: {
            "rooms.$[roomElem].entries.$[entryElem].roomImages": imageUrls,
            "rooms.$[roomElem].entries.$[entryElem].notes": notes,
            "rooms.$[roomElem].entries.$[entryElem].workerId": userId,
            "rooms.$[roomElem].entries.$[entryElem].createdAt": Math.floor(
              Date.now() / 1000
            ),
            "rooms.$[roomElem].entries.$[entryElem].isTask": true,
          },
        },
        {
          arrayFilters: [
            { "roomElem.roomId": taskResult.room },
            { "entryElem.taskId": taskId },
          ],
        },
        { new: true }
      );

      //   if no existing entry is there we will push new entry

      if (
        updateExistingEntry.matchedCount === 0 ||
        updateExistingEntry.modifiedCount === 0
      ) {
        await Flat.updateOne(
          { _id: taskResult.flatNo, "rooms.roomId": taskResult.room },
          {
            $push: {
              "rooms.$[roomElem].entries": {
                roomImages: imageUrls,
                notes: notes,
                workerId: userId,
                taskId: taskId,
                isTask: true,
              },
            },
          },
          {
            arrayFilters: [{ "roomElem.roomId": taskResult.room }],
          }
        );
      }

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
