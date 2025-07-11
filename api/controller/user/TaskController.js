const { entries } = require("mongoose/lib/helpers/specialProperties");
const { returnCode } = require("../../../config/responseCode");
const UtilController = require("../../controller/services/UtilController");
const Task = require("../../model/Task");

module.exports = {
  queryTasks: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const userObjectId = await UtilController.convertToMongoose(userId);
      const { status } = req.query;

      let matchFilter = {
        workerId: userObjectId,
        active: true,
      };

      const currentDate = await UtilController.convertToEpoch(new Date());

      const { startOfDay, endOfDay } = await UtilController.getStartAndEndOfDay(
        currentDate
      );

      if (!status) {
        matchFilter.createdAt = { $gte: startOfDay, $lte: endOfDay };
      } else {
        matchFilter.taskStatus = status;
      }

      console.log(matchFilter);

      const result = await Task.aggregate([
        { $match: matchFilter },
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
          $group: {
            _id: "$projectId",
            projectDetails: { $first: "$projectDetails" },
            taskCount: {
              $sum: {
                $cond: [
                  status
                    ? { $eq: ["$taskStatus", status] }
                    : {
                        $and: [
                          { $gte: ["$createdAt", startOfDay] },
                          { $lte: ["$createdAt", endOfDay] },
                        ],
                      },
                  1,
                  0,
                ],
              },
            },
          },
        },

        {
          $project: {
            _id: 0,
            projectDetails: {
              $mergeObjects: [
                {
                  _id: "$projectDetails._id",
                  projectName: "$projectDetails.projectName",
                  location: "$projectDetails.location",
                  startDate: "$projectDetails.startDate",
                  endDate: "$projectDetails.endDate",
                  status: "$projectDetails.status",
                },
                { taskCount: "$taskCount" },
              ],
            },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks list fetched successfully",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log(error);

      return UtilController.sendError(req, res, next, error);
    }
  },

  getAllTasksInProjects: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }
      const userObjectId = await UtilController.convertToMongoose(userId);

      const { status, projectId } = req.body;
      const projectObjectId = await UtilController.convertToMongoose(projectId);

      const matchFilter = {
        projectId: projectObjectId,
        workerId: userObjectId,
        active: true,
        taskStatus: status,
      };

      const taskResult = await Task.aggregate([
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
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
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
            as: "taskEntries",
          },
        },
        {
          $unwind: {
            path: "$taskEntries",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              floorId: "$floorDetails._id",
              flatId: "$flatDetails._id",
            },
            floorNo: { $first: "$floorDetails.floorNo" },
            flatNo: { $first: "$flatDetails.flatNo" },
            tasks: {
              $push: {
                _id: "$_id",
                taskId: "$taskId",
                taskDescription: "$taskDescription",
                taskStatus: "$taskStatus",
                room: "$roomDetails.roomName",
                supervisor: "$userDetails.fullName",
                entries: "$taskEntries",
              },
            },
          },
        },

        {
          $group: {
            _id: "$_id.floorId",
            floorNo: { $first: "$floorNo" },
            flats: {
              $push: {
                flatId: "$_id.flatId",
                flatNo: "$flatNo",
                tasks: "$tasks",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            floorId: "$_id",
            floorNo: 1,
            flats: 1,
          },
        },
      ]);

      const result = taskResult;

      return UtilController.sendSuccess(req, res, next, {
        message: "Tasks list fetched successfully",
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log(error);

      return UtilController.sendError(req, res, next, error);
    }
  },
};
