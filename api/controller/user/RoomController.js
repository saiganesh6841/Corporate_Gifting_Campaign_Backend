const User = require("../../model/User");
const Task = require("../../model/Task");
const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");
const Flat = require("../../model/ProjectFlats");
const Entry = require("../../model/Entries");
const Chat = require("../../model/Chat");

module.exports = {
  taskDetails: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }
      

      const { flatId, roomId, status } = req.body;

      const flatObjectId = await UtilController.convertToMongoose(flatId);
      const roomObjectId = await UtilController.convertToMongoose(roomId);
      const userObjectId = await UtilController.convertToMongoose(userId);

      // 1️⃣ Match tasks for the given flat, room, and status
      const matchFilter = {
        flatNo: flatObjectId,
        room: roomObjectId,
        taskStatus: status || "pending",
        workerId: userObjectId,
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
            from: "entries",
            let: { flatId: "$flatNo", roomId: "$room", taskId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$flatId", "$$flatId"] },
                      { $eq: ["$roomId", "$$roomId"] },
                      { $eq: ["$taskId", "$$taskId"] },
                    ],
                  },
                },
              },
            ],
            as: "roomDetails",
          },
        },
        {
          $unwind: {
            path: "$roomDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            taskName: 1,
            taskDescription: 1,
            taskStatus: 1,
            createdAt: 1,
            supervisorName: "$assignedSupervisor.fullName",
            supervisorImage: "$assignedSupervisor.profileImage",
            supervisorId: "$assignedSupervisor._id",
            roomDetails: 1,
          },
        },
      ];

      const tasks = await Task.aggregate(pipeline);

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks fetched successfully",
        responseCode: returnCode.validSession,
        result: tasks,
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
          responseCode: returnCode.invalidSession,
        });
      }

      const { taskId, imageUrls, notes } = req.body;

      // Validate task
      const taskResult = await Task.findById(taskId);
      if (!taskResult) {
        return UtilController.sendError(req, res, next, {
          message: "Task not found",
          responseCode: returnCode.validationError,
        });
      }

      const flatObjectId = await UtilController.convertToMongoose(
        taskResult.flatNo
      );
      const roomObjectId = await UtilController.convertToMongoose(
        taskResult.room
      );

      // Check if an entry already exists for this task
      let existingEntry = await Entry.findOne({
        flatId: taskResult.flatNo,
        roomId: taskResult.room,
        taskId: taskId,
      });

      let newEntry;

      if (existingEntry) {
        // Update the existing entry
        existingEntry.roomImages = imageUrls;
        existingEntry.notes = notes;
        existingEntry.workerId = userId;
        existingEntry.createdAt = Math.floor(Date.now() / 1000);
        existingEntry.isTask = true;

        await existingEntry.save();
      } else {
        // Create a new entry
        newEntry = new Entry({
          flatId: taskResult.flatNo,
          roomId: taskResult.room,
          taskId: taskId,
          roomImages: imageUrls,
          notes: notes,
          workerId: userId,
          isTask: true,
          createdAt: Math.floor(Date.now() / 1000),
        });
        await newEntry.save();
        await Flat.findOneAndUpdate(
          {
            _id: flatObjectId,
            "rooms.roomId": roomObjectId,
          },
          {
            $push: { "rooms.$.entries": newEntry._id },
          },
          { new: true }
        );
      }

      //   update the chat with the entry id
      let entryId = existingEntry ? existingEntry._id : newEntry._id;

      await Chat.findOneAndUpdate(
        { entryId: entryId },
        {
          $set: {
            chats: {
              message: notes,
              isAdminCreated: false,
              userId: userId,
            },
          },
          $setOnInsert: {
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
          },
        },
        { new: true, upsert: true }
      );

      // Update task status
      await Task.findByIdAndUpdate(taskId, {
        $set: {
          taskStatus: "completed",
        },
      });

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully submitted the task",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },
};
