const { returnCode } = require("../../../config/responseCode");
const Entries = require("../../model/Entries");
const UtilController = require("../services/UtilController");

module.exports = {
  getProgressTimeline: async (req, res, next) => {
    try {
      const { roomId, flatId } = req.body;
      let queryObj = {
        roomId: UtilController.convertToMongoose(roomId),
        flatId: UtilController.convertToMongoose(flatId),
      };

      const pipeline = [
        { $match: queryObj },
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
            from: "projects",
            localField: "flatDetails.projectId",
            foreignField: "_id",
            as: "projectDetails",
          },
        },
        { $unwind: "$projectDetails" },
        {
          $project: {
            roomImages: 1,
            notes: 1,
            uploadedDate: "$createdAt",
            projectCreatedAt: "$projectDetails.createdAt", // temporarily keep it for extracting once
          },
        },
      ];

      const results = await Entries.aggregate(pipeline);

      let createdOn = null;
      if (results.length > 0) {
        createdOn = results[0].projectCreatedAt;
      }

      // Remove projectCreatedAt from each item
      const progressTimeLine = results.map(
        ({ projectCreatedAt, ...rest }) => rest
      );

      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        message: "success",
        createdOn,
        progressTimeLine,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
};
