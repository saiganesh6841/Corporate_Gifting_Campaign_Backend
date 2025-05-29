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
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getTaskById: async (req, res, next) => {
    try {
      const recordId = req.body.recordId;
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
  updateTask: async (req, res, next) => {
    try {
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  deleteTask: async (req, res, next) => {
    try {
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
};
