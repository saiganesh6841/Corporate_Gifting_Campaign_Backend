const User = require("../../model/User");
const Project = require("../../model/Project");
const UtilController = require("../services/UtilController");
const Floor = require("../../model/ProjectFloors");
const Flat = require("../../model/ProjectFlats");
const Task = require("../../model/Task");
const Tag = require("../../model/Tag");
const Entry = require("../../model/Entries");
const { returnCode } = require("../../../config/responseCode");
// const mongoose = require("mongoose");
const Attendance = require("../../model/Attendance");
const Chat = require("../../model/Chat");
const Entries = require("../../model/Entries");

module.exports = {
  // queryAllPendingProjects: async (req, res, next) => {
  //   try {
  //     let { userId } = req.user;

  //     if (!userId) {
  //       return UtilController.sendError(req, res, next, {
  //         message: "User not found",
  //         responsCode: returnCode.invalidSession,
  //       });
  //     }

  //     userId = await UtilController.convertToMongoose(userId);
  //     const result = await Project.aggregate([
  //       {
  //         $match: { assignedWorkers: userId, active: true, status: "pending" },
  //       },
  //       { $project: { assignedWorkers: 0, assignedSupervisor: 0 } },
  //     ]);

  //     return UtilController.sendSuccess(req, res, next, {
  //       message: "succesfully fetched projects",
  //       responseCode: returnCode.validSession,
  //       result,
  //     });
  //   } catch (error) {
  //     return UtilController.sendError(req, res, next, error);
  //   }
  // },

  projectAndTaskCounts: async (req, res, next) => {
    try {
      let { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      // const { date } = req.query;
      // const { startOfDay, endOfDay } = await UtilController.getStartAndEndOfDay(
      //   Number(date) || Date.now()
      // );

      const userObjectId = await UtilController.convertToMongoose(userId);

      // Run both project and task aggregation in parallel
      const [projectResult, assignedTasksCount] = await Promise.all([
        Project.aggregate([
          {
            $match: {
              assignedWorkers: userObjectId,
              active: true,
              // createdAt: { $gte: startOfDay, $lte: endOfDay },
            },
          },
          {
            $facet: {
              all: [{ $count: "assigned" }],
              pending: [{ $match: { status: "pending" } }, { $count: "count" }],
              completed: [
                { $match: { status: "completed" } },
                { $count: "count" },
              ],
            },
          },
          {
            $project: {
              assigned: {
                $ifNull: [{ $arrayElemAt: ["$all.assigned", 0] }, 0],
              },
              pending: {
                $ifNull: [{ $arrayElemAt: ["$pending.count", 0] }, 0],
              },
              completed: {
                $ifNull: [{ $arrayElemAt: ["$completed.count", 0] }, 0],
              },
            },
          },
        ]),

        Task.countDocuments({
          workerId: userObjectId,
          active: true,
          // createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
      ]);

      const currentDate = await UtilController.convertTOISOFormat();

      const checkedInResult = await Attendance.aggregate([
        {
          $match: {
            userId: userObjectId,
            attendanceDate: currentDate,
          },
        },
      ]);

      const projectCounts = projectResult[0] || {
        assigned: 0,
        pending: 0,
        completed: 0,
      };

      const assignedTasks = assignedTasksCount;

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks fetched for the selected date",
        responseCode: returnCode.validSession,
        result: {
          projectCounts,
          taskCounts: {
            assignedTasks,
          },
          loggedInDetails:
            checkedInResult.length === 0 ? null : checkedInResult[0],
        },
      });
    } catch (error) {
      console.error("Error in taskCount:", error);
      return UtilController.sendError(req, res, next, {
        message: "Error fetching task counts",
        responsCode: returnCode.serverError,
      });
    }
  },

  projectDetails: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { projectId } = req.body;
      const projectObjectId = await UtilController.convertToMongoose(projectId);

      // Fetch project details with assignedSupervisor details
      const projectDetailsResult = await Project.aggregate([
        {
          $match: { _id: projectObjectId, active: true },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignedSupervisor",
            foreignField: "_id",
            as: "assignedSupervisorDetails",
          },
        },
        {
          $unwind: {
            path: "$assignedSupervisorDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            projectName: 1,
            location: 1,
            startDate: 1,
            clientName: 1,
            status: 1,
            assignedSupervisorDetails: {
              _id: 1,
              fullName: 1,
              email: 1,
              mobileNumber: 1,
            },
          },
        },
      ]);

      const projectDetails = projectDetailsResult[0] || {};

      // Fetch floors
      const floorResult = await Floor.aggregate([
        { $match: { projectId: projectObjectId, active: true } },
      ]);

      // Fetch flats and rooms for each floor in parallel
      const allFloorsDetails = await Promise.all(
        floorResult.map(async (floor) => {
          const flatsWithRooms = await Flat.aggregate([
            {
              $match: {
                projectId: projectObjectId,
                floorId: floor._id,
                active: true,
              },
            },
            {
              $lookup: {
                from: "projectfloors",
                localField: "floorId",
                foreignField: "_id",
                as: "floorDetails",
              },
            },
            {
              $unwind: {
                path: "$floorDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            { $unwind: { path: "$rooms", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "rooms",
                localField: "rooms.roomId",
                foreignField: "_id",
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
              $addFields: {
                "roomDetails.roomImages": "$rooms.roomImages",
              },
            },
            {
              $group: {
                _id: "$flatNo",
                flatId: { $first: "$_id" },
                floorId: { $first: "$floorId" },
                projectId: { $first: "$projectId" },
                active: { $first: "$active" },
                rooms: { $push: "$roomDetails" },
              },
            },
          ]);

          return {
            floorNo: floor.floorNo,
            flats: flatsWithRooms.map((flat) => ({
              flatId: flat.flatId,
              flatNo: flat._id,
              rooms: flat.rooms,
            })),
          };
        })
      );

      // Send the final combined response
      return UtilController.sendSuccess(req, res, next, {
        message: "Project details fetched successfully",
        responseCode: returnCode.validSession,
        projectDetails: {
          ...projectDetails,
          details: allFloorsDetails,
        },
      });
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },

  submitProjectUploads: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { flatId, roomId, imageUrls, notes } = req.body;

      // Convert to ObjectId
      const flatObjectId = await UtilController.convertToMongoose(flatId);
      const roomObjectId = await UtilController.convertToMongoose(roomId);

      // Get next uploadId
      const tagResult = await Tag.findOneAndUpdate(
        { tagType: "upload", active: true },
        {
          $inc: { sequenceNo: 1 },
          updatedAt: Math.floor(Date.now() / 1000),
        },
        { new: true }
      );

      const uploadId =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

      // Create a new Entry document
      const newEntry = new Entry({
        flatId: flatObjectId,
        roomId: roomObjectId,
        roomImages: imageUrls,
        notes: notes,
        workerId: userId,
        isTask: false,
        uploadId: uploadId,
        createdAt: Math.floor(Date.now() / 1000),
      });

      await newEntry.save();

      // Push only the _id of the entry into the corresponding room's entries array
      const updatedFlat = await Flat.findOneAndUpdate(
        {
          _id: flatObjectId,
          "rooms.roomId": roomObjectId,
        },
        {
          $push: { "rooms.$.entries": newEntry._id },
        },
        { new: true }
      );

      // create a chat using the entry id

      await Chat.findOneAndUpdate(
        { entryId: newEntry._id },
        {
          $set: {
            chats: {
              message: notes,
              isAdminCreated: false,
            },
          },
          $setOnInsert: {
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
          },
        },
        { new: true, upsert: true }
      );

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully submitted the project uploads",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.error("Error submitting project uploads:", error);
      UtilController.sendError(req, res, next, error);
    }
  },

  queryAllProjects: async (req, res, next) => {
    try {
      let { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      userId = await UtilController.convertToMongoose(userId);

      const { status } = req.query;

      const matchFilter = {
        assignedWorkers: userId,
        active: true,
      };

      if (status !== "" && status !== undefined) {
        matchFilter.status = status;
      }

      userId = await UtilController.convertToMongoose(userId);

      const result = await Project.aggregate([
        {
          $match: matchFilter,
        },
        { $project: { assignedWorkers: 0, assignedSupervisor: 0 } },
      ]);

      return UtilController.sendSuccess(req, res, next, {
        message: "succesfully fetched projects",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },

  queryAllUploads: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { flatId, roomId, isTask } = req.body;

      const flatObjectId = await UtilController.convertToMongoose(flatId);
      const roomObjectId = await UtilController.convertToMongoose(roomId);

      const matchStage = {
        flatId: flatObjectId,
        roomId: roomObjectId,
      };

      if (isTask !== undefined && isTask !== "" && isTask !== null) {
        matchStage.isTask = isTask;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: "projectflats",
            localField: "flatId",
            foreignField: "_id",
            as: "flatDetails",
          },
        },
        { $unwind: "$flatDetails" },
        {
          $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "roomDetails",
          },
        },
        { $unwind: "$roomDetails" },
        {
          $project: {
            _id: 1,
            roomImages: 1,
            notes: 1,
            workerId: 1,
            uploadId: 1,
            isTask: 1,
            createdAt: 1,
            flatNo: "$flatDetails.flatNo",
            roomName: "$roomDetails.roomName",
          },
        },
        { $sort: { createdAt: -1 } },
      ];

      const entries = await Entry.aggregate(pipeline);

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched the uploaded data",
        result: entries,
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.error("Error in queryAllUploads:", error);
      UtilController.sendError(req, res, next, error);
    }
  },

  singleUploadDetails: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { entryId } = req.body;
      const entryObjectId = await UtilController.convertToMongoose(entryId);

      const [entry] = await Entries.aggregate([
        {
          $match: { _id: entryObjectId },
        },
        {
          $project: {
            _id: 1,
            roomImages: 1,
            uploadId: {
              $cond: {
                if: { $ne: ["$uploadId", null] },
                then: "$uploadId",
                else: "$$REMOVE",
              },
            },
            taskId: {
              $cond: {
                if: { $ne: ["$taskId", null] },
                then: "$taskId",
                else: "$$REMOVE",
              },
            },
          },
        },
      ]);

      if (!entry) {
        return UtilController.sendError(req, res, next, {
          message: "Entry not found",
          responseCode: returnCode.invalidData,
        });
      }

      const result = {
        roomImages: entry.roomImages,
      };

      //  If the entry has a taskId, fetch supervisor details
      if (entry.taskId) {
        const [supervisor] = await Task.aggregate([
          { $match: { _id: entry.taskId } },
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
            $project: {
              _id: 1,
              taskDescription: 1,
              taskStatus: 1,
              taskId: 1,
              createdAt: 1,
              supervisorName: "$assignedSupervisor.fullName",
              supervisorImage: "$assignedSupervisor.profileImage",
              // supervisorId: "$assignedSupervisor._id",
            },
          },
        ]);

        if (supervisor) {
          result.supervisorDetails = supervisor;
        }
      }

      //  Fetch chats (if any)
      const chat = await Chat.findOne({ entryId });
      if (chat?.chats) {
        result.chats = chat.chats;
      }

      //  Send the final response
      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched uploads and chats",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },

  addMessage: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { entryId, message } = req.body;
      if (!message) {
        return UtilController.sendError(req, res, next, {
          message: "Message is required",
          responseCode: returnCode.validationError,
        });
      }
      const entryObjectId = await UtilController.convertToMongoose(entryId);

      // update the chat based on the entryId
      await Chat.findOneAndUpdate(
        { entryId: entryObjectId },
        {
          $push: {
            chats: {
              message: message,
              isAdminCreated: false,
            },
          },
          $setOnInsert: {
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
          },
        },
        { new: true, upsert: true }
      );

      return UtilController.sendSuccess(req, res, next, {
        message: "Succesfully added new message",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
};
