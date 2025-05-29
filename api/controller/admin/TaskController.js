const { returnCode } = require("../../../config/responseCode");
const Tag = require("../../model/Tag");
const Task = require("../../model/Task");
const UtilController = require("../services/UtilController");

module.exports = {
  createTask: async (req, res, next) => {
    try {
      const { ...createObj } = req.body;
      //   console.log("createObj: ", createObj);

      const { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const createdTasks = [];

      for (let taskItem of createObj.task) {
        const tagResult = await Tag.findOneAndUpdate(
          {
            tagType: "task",
            active: true,
          },
          {
            $inc: { sequenceNo: 1 },
            updatedAt: Math.floor(Date.now() / 1000),
          }
        );

        const taskId =
          tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

        const newTask = {
          ...createObj,
          taskId: taskId,
          taskDescription: taskItem.taskDescription,
          taskStatus: taskItem.taskStatus || "pending",
          createdBy: userId,
        };

        const taskResult = await Task.create(newTask);

        createdTasks.push(taskResult);
      }

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks created successfully",
        responseCode: returnCode.validSession,
        tasks: createdTasks,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, {
        message: "Something went wrong",
        responseCode: returnCode.internalServerError,
      });
    }
  },
  getAllTask: async (req, res, next) => {
    try {
      const { ...filters } = req.body;
      let queryObj = {
        active: filters.active ?? true,
      };
      if (filters.active === "All") {
        delete queryObj.active;
      }

      let sortOrder = {};

      sortOrder = {
        createdAt: -1,
      };

      let page = 0;
      let pageSize = 10;
      if (
        !UtilController.isEmpty(filters.page) &&
        !UtilController.isEmpty(filters.pageSize)
      ) {
        page = Number(filters.page);
        pageSize = Number(filters.pageSize);
      }

      let searchKey = filters.keyword ?? "";

      if (!UtilController.isEmpty(filters.startDate)) {
        queryObj["$and"] = [
          { createdAt: { $gte: filters.startDate } },
          {
            createdAt: {
              $lte: filters.endDate || Math.floor(new Date() / 1000),
            },
          },
        ];
      }

      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [
          { roomId: { $regex: searchKey, $options: "i" } },
          { roomName: { $regex: searchKey, $options: "i" } },
        ];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdByUser",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "workerId",
            foreignField: "_id",
            as: "workerDetails",
          },
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
          $project: {
            taskId: 1,
            taskDescription: 1,
            createdAt: 1,
            updatedAt: 1,
            active: 1,
            taskStatus: 1,
            projectName: {
              $arrayElemAt: ["$projectDetails.projectName", 0],
            },
            workerDetails: {
              $arrayElemAt: ["$workerDetails.fullName", 0],
            },
            workerMobileNumber: {
              $arrayElemAt: ["$workerDetails.mobileNumber", 0],
            },
            createdBy: {
              $arrayElemAt: ["$createdByUser.fullName", 0],
            },
          },
        },
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Task.aggregate(pipeline);
      let pageCount = await Task.countDocuments(queryObj);

      UtilController.sendSuccess(req, res, next, {
        rows: result,
        pages: Math.ceil(pageCount / pageSize),
        filterRecords: pageCount,
        message: "success",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },

  getTaskById: async (req, res, next) => {
    try {
      const recordId = req.body.recordId;
      if (!recordId) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }
      const pipeLine = [
        {
          $match: {
            _id: UtilController.convertToMongoose(recordId),
            active: true,
          },
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
            from: "projectfloors",
            localField: "floorNo",
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
          $lookup: {
            from: "rooms",
            localField: "room",
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
          $lookup: {
            from: "users",
            localField: "workerId",
            foreignField: "_id",
            as: "workerDetails",
          },
        },
        {
          $unwind: {
            path: "$workerDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            taskStatus: 1,
            taskDescription: 1,
            taskId: 1,
            projectName: "$projectDetails.projectName",
            projectId: "$projectDetails._id",
            floor: "$floorDetails.floorNo",
            floorId: "$floorDetails._id",
            flat: "$flatDetails.flatNo",
            flatId: "$flatDetails._id",
            room: "$roomDetails.roomName",
            worker: "$workerDetails.fullName",
          },
        },
      ];
      const task = await Task.aggregate(pipeLine);

      if (!task) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched the task",
        responseCode: returnCode.validSession,
        task,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  taskView: async (req, res, next) => {
    try {
      const recordId = req.body.recordId;

      if (!recordId) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const pipeLine = [
        {
          $match: {
            _id: UtilController.convertToMongoose(recordId),
            active: true,
          },
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
            from: "projectfloors",
            localField: "floorNo",
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
          $lookup: {
            from: "rooms",
            localField: "room",
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
          $lookup: {
            from: "users",
            localField: "workerId",
            foreignField: "_id",
            as: "workerDetails",
          },
        },
        {
          $unwind: {
            path: "$workerDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdDetails",
          },
        },
        {
          $unwind: {
            path: "$createdDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "entries",
            localField: "_id",
            foreignField: "taskId",
            as: "entryDetails",
          },
        },
        {
          $unwind: {
            path: "$entryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            taskStatus: 1,
            taskDescription: 1,
            taskId: 1,
            createdAt: 1,
            workerName: "$workerDetails.fullName",
            workerImage: "$workerDetails.profileImage",
            createdByName: "$createdDetails.fullName",
            createdImage: "$createdDetails.profileImage",
            createdUserType: "$createdDetails.userType",
            projectName: "$projectDetails.projectName",
            projectId: "$projectDetails._id",
            floor: "$floorDetails.floorNo",
            floorId: "$floorDetails._id",
            flat: "$flatDetails.flatNo",
            flatId: "$flatDetails._id",
            roomName: "$roomDetails.roomName",
            images: "$entryDetails.roomImages",
          },
        },
      ];
      const task = await Task.aggregate(pipeLine);

      if (!task) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched the task",
        responseCode: returnCode.validSession,
        task,
      });
    } catch (error) {
      UtilController.sendError(req, res, next);
    }
  },
  updateTask: async (req, res, next) => {
    try {
      const { recordId } = req.body;

      const isRoomExists = await Task.findById(recordId);

      if (!isRoomExists) {
        return UtilController.sendError(req, res, next, {
          message: "Task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const updatedTask = await Task.findByIdAndUpdate(
        recordId,
        {
          ...req.body,
          updatedAt: Math.floor(Date.now() / 1000),
        },
        { new: true }
      );
      return UtilController.sendSuccess(req, res, next, {
        message: "successfully updated task",
        responseCode: returnCode.validSession,
        roomResult: updatedTask,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  deleteTask: async (req, res, next) => {
    try {
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return UtilController.sendSuccess(req, res, next, {
          message: "taskIds array is required",
          responseCode: returnCode.invalidInput,
        });
      }

      await Task.updateMany(
        { _id: { $in: taskIds } },
        { $set: { active: false } }
      );

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully deleted the task",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
};
