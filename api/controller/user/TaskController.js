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

      if (!status) {
        const currentDate = await UtilController.convertToEpoch(new Date());

        const { startOfDay, endOfDay } =
          await UtilController.getStartAndEndOfDay(currentDate);

        matchFilter.createdAt = { $gte: startOfDay, $lte: endOfDay };
      } else {
        matchFilter.taskStatus = status;
      }

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
      return UtilController.sendError(req, res, next, error);
    }
  },
};
