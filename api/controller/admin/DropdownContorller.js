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
            status: req?.body?.status,
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
      const { projectId, floorId, flatId } = req.body;
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
                      {
                        $eq: ["$_id", UtilController.convertToMongoose(flatId)],
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
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $unwind: {
            path: "$flatDetails.rooms",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "rooms",
            let: { roomId: "$flatDetails.rooms.roomId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", { $toObjectId: "$$roomId" }],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  roomName: 1,
                  roomLogo: 1,
                  color: 1,
                },
              },
            ],
            as: "roomInfo",
          },
        },
        {
          $unwind: {
            path: "$roomInfo",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id: null,
            result: {
              $push: {
                _id: "$roomInfo._id",
                roomName: "$roomInfo.roomName",
                roomLogo: "$roomInfo.roomLogo",
                color: "$roomInfo.color",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            result: 1,
          },
        },
      ];

      const result = await Project.aggregate(pipeline);

      // Extract the result array from the grouped result
      const finalResult = result.length > 0 ? result[0].result : [];

      UtilController.sendSuccess(req, res, next, {
        responseCode: returnCode.validSession,
        result: finalResult,
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
            workerId: "$workerDetails._id",
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
