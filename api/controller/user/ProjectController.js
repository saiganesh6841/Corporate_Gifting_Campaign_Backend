const User = require("../../model/User");
const Project = require("../../model/Project");
const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");

module.exports = {
  queryProjects: async (req, res, next) => {
    let { userId } = req.user;

    if (!userId) {
      return UtilController.sendError(req, res, next, {
        message: "User not found",
        responsCode: returnCode.invalidSession,
      });
    }

    userId = await UtilController.convertToMongoose(userId);

    const projectData = await Project.aggregate([
      { $match: { assignedWorkers: userId, active: true } },
      { $unwind: "$details" },
    //   {
    //     $addFields: {
    //       "details.rooms": {
    //         $map: {
    //           input: "$details.rooms",
    //           as: "roomId",
    //           in: { $toObjectId: "$$roomId" },
    //         },
    //       },
    //     },
    //   },
      { $unwind: "$details.rooms" },
      {
        $lookup: {
          from: "rooms",
          localField: "details.rooms",
          foreignField: "_id",
          as: "roomDetails",
        },
      },
    //   { $unwind: "$roomDetails" },
    ]);

    // console.log(projectData);

    // return UtilController.sendSuccess(req, res, next, {
    //   message: "successfully fetched projects",
    //   responseCode: returnCode.validSession,
    //   projects: projectResult,
    // });
  },
};
