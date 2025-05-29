const { returnCode } = require("../../../config/responseCode");
const Project = require("../../model/Project");
const ProjectFloors = require("../../model/ProjectFloors");
const UtilController = require("../services/UtilController");

module.exports = {
  getProjects: async (req, res, next) => {
    try {
      const pipeline = [
        {
          $match: {
            active: true,
          },
        },
        {
          $project: {
            projectName: 1,
            _id: 1,
          },
        },
      ];
      const result = await Project.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getFloors: async (req, res, next) => {
    try {
      const { projectId } = req.body;
      const pipeline = [
        {
          $match: {
            active: true,
            _id: UtilController.convertToMongoose(projectId),
          },
        },
        {
          $lookup: {
            from: "projectfloors",
            localField: "_id",
            foreignField: "projectId",
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
          $project: {
            _id: 0,
            floor: "$floorDetails.floorNo",
            _id: "$floorDetails._id",
          },
        },
      ];

      const result = await Project.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
  getFlats: async (req, res, next) => {
    try {
      const { projectId, floorId } = req.body;
      const pipeline = [
        {
          $match: {
            active: true,
            _id: UtilController.convertToMongoose(projectId),
          },
        },
        {
          $lookup: {
            from: "projectflats",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$projectId", "$$projectId"] },
                      {
                        $eq: [
                          "$floorId",
                          UtilController.convertToMongoose(floorId),
                        ],
                      },
                    ],
                  },
                },
              },
            ],
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
          $project: {
            _id: 0,
            flat: "$flatDetails.flatNo",
            _id: "$flatDetails._id",
          },
        },
      ];

      const result = await Project.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
  getRooms: async (req, res, next) => {
    try {
      const { projectId, floorId } = req.body;
      const pipeline = [
        {
          $match: {
            active: true,
            _id: UtilController.convertToMongoose(projectId),
          },
        },
        {
          $lookup: {
            from: "projectflats",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$projectId", "$$projectId"] },
                      {
                        $eq: [
                          "$floorId",
                          UtilController.convertToMongoose(floorId),
                        ],
                      },
                    ],
                  },
                },
              },
            ],
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
          $project: {
            _id: 0,
            flat: "$flatDetails.flatNo",
            _id: "$flatDetails._id",
          },
        },
      ];

      const result = await Project.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
  getWorkers: async (req, res, next) => {
    try {
      const { projectId } = req.body;
      const pipeline = [
        {
          $match: {
            active: true,
            _id: UtilController.convertToMongoose(projectId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "assignedWorkers",
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
            _id: 0,
            workerName: "$workerDetails.fullName",
          },
        },
      ];

      const result = await Project.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        result,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
};
