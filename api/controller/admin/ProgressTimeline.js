const { returnCode } = require("../../../config/responseCode");
const Entries = require("../../model/Entries");
const UtilController = require("../services/UtilController");

module.exports = {
  getProgressTimeline: async (req, res, next) => {
    try {
      const {
        roomId,
        flatId,
        startDate,
        endDate,
        page = 1,
        pageSize = 10,
        projectId,
      } = req.body;

      const pageNumber = parseInt(page);
      const size = parseInt(pageSize);
      const skip = (pageNumber - 1) * size;

      let queryObj = {};
      let results;

      if (
        !UtilController.isEmpty(startDate) &&
        !UtilController.isEmpty(endDate)
      ) {
        queryObj.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      if (UtilController.isEmpty(flatId) && UtilController.isEmpty(roomId)) {
        queryObj.projectId = UtilController.convertToMongoose(projectId);
      } else if(UtilController.isEmpty(roomId)) {
        queryObj.flatId = UtilController.convertToMongoose(flatId);
      } else{
        queryObj.roomId = UtilController.convertToMongoose(roomId);
        queryObj.flatId = UtilController.convertToMongoose(flatId);
      }

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
            projectCreatedAt: "$projectDetails.createdAt",
          },
        },
      ];

      results = await Entries.aggregate(pipeline);

      const countPipeline = [
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
        { $count: "total" },
      ];

      const countResult = await Entries.aggregate(countPipeline);
      const totalRecords = countResult[0]?.total || 0;

      let createdOn = null;
      if (results.length > 0) {
        createdOn = results[0].projectCreatedAt;
      }

      const progressTimeLine = results.map(
        ({ projectCreatedAt, ...rest }) => rest
      );

      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        message: "success",
        createdOn,
        progressTimeLine,
        pages: Math.ceil(totalRecords / pageSize),
        filterRecords: totalRecords,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
};
