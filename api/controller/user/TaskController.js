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

      if (!status) {
        const currentDate = await UtilController.convertToEpoch(new Date());

        const { startOfDay, endOfDay } =
          await UtilController.getStartAndEndOfDay(currentDate);


        const result = await Task.aggregate([
          {
            $match: {
              workerId: userObjectId,
              createdAt: { $gte: startOfDay, $lte: endOfDay },
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
            $project:{

            }
          }
        ]);
        console.log(result);
      }
    } catch (error) {
      return UtilController.sendError(req, res, next, error);
    }
  },
};
