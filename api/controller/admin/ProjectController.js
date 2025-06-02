const Project = require("../../model/Project");
const Room = require("../../model/Room");
const Tag = require("../../model/Tag");
const { returnCode } = require("../../../config/responseCode");
const UtilController = require("../services/UtilController");
const mongoose = require("mongoose");
const ProjectFlats = require("../../model/ProjectFlats");
const ProjectFloors = require("../../model/ProjectFloors");
const Chat = require("../../model/Chat");
const User = require("../../model/User");

module.exports = {
  createProject: async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { mobileNumber, email, details = [], ...projectData } = req.body;

      const { userId } = req.user;

      if (!userId) {
        await session.abortTransaction();
        session.endSession();
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const tagResult = await Tag.findOneAndUpdate(
        {
          tagType: "project",
          active: true,
        },
        {
          $inc: { sequenceNo: 1 },
          updatedAt: Math.floor(Date.now() / 1000),
        },
        { session, new: true }
      );
      projectData["projectId"] =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

      const project = await Project.create(
        [
          {
            ...projectData,
            clientPhoneNo: mobileNumber,
            clientEmail: email,
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          },
        ],
        { session }
      );

      const projectDoc = project[0];

      for (const floor of details) {
        const floorTagResult = await Tag.findOneAndUpdate(
          {
            tagType: "floor",
            active: true,
          },
          {
            $inc: { sequenceNo: 1 },
            updatedAt: Math.floor(Date.now() / 1000),
          },
          { session, new: true }
        );
        const floorsId =
          floorTagResult.prefix +
          UtilController.pad(floorTagResult.sequenceNo, 5);

        const floorDoc = await ProjectFloors.create(
          [
            {
              floorId: floorsId,
              floorNo: floor.floorNo,
              projectId: projectDoc._id,
              createdBy: userId,
              createdAt: Math.floor(Date.now() / 1000),
              updatedAt: Math.floor(Date.now() / 1000),
            },
          ],
          { session }
        );

        const floorRef = floorDoc[0];

        // const flatTagResult = await Tag.findOneAndUpdate(
        //   {
        //     tagType: "flat",
        //     active: true,
        //   },
        //   {
        //     $inc: { sequenceNo: 1 },
        //     updatedAt: Math.floor(Date.now() / 1000),
        //   },
        //   { session, new: true }
        // );
        // const flatsId =
        //   flatTagResult.prefix +
        //   UtilController.pad(flatTagResult.sequenceNo, 5);

        for (const flat of floor.roomDetails) {
          const flatObj = {
            // flatId: flatsId,
            flatNo: flat.flatNo,
            floorId: floorRef._id,
            projectId: projectDoc._id,
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
            rooms: flat.rooms.map((roomId) => ({
              roomId: UtilController.convertToMongoose(roomId),
              roomImages: [],
            })),
          };

          await ProjectFlats.create([flatObj], { session });
        }
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return UtilController.sendSuccess(req, res, next, {
        message: "Project created successfully",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      await session.abortTransaction();
      session.endSession();
      return UtilController.sendError(req, res, next, {
        message: "Something went wrong",
        responseCode: returnCode.internalServerError,
      });
    }
  },

  addMessage: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { entryId, message } = req.body;
      if (!message) {
        return UtilController.sendError(req, res, next, {
          message: "Message is required",
          responseCode: returnCode.validationError,
        });
      }
      const entryObjectId = await UtilController.convertToMongoose(entryId);

      // update the chat based on the entryId
      await Chat.findOneAndUpdate(
        { entryId: entryObjectId },
        {
          $push: {
            chats: {
              message: message,
              isAdminCreated: true,
              userId: userId,
            },
          },
          $setOnInsert: {
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
          },
        },
        { new: true, upsert: true }
      );

      return UtilController.sendSuccess(req, res, next, {
        message: "Succesfully added new message",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, error);
    }
  },
  listProject: async (req, res, next) => {
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
          { projectId: { $regex: searchKey, $options: "i" } },
          { projectName: { $regex: searchKey, $options: "i" } },
          { clientName: { $regex: searchKey, $options: "i" } },
          { location: { $regex: searchKey, $options: "i" } },
          { status: { $regex: searchKey, $options: "i" } },
        ];
      }

      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            projectId: 1,
            projectName: 1,
            clientName: 1,
            location: 1,
            startDate: 1,
            endDate: 1,
            status: 1,
          },
        },
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Project.aggregate(pipeline);
      let pageCount = await Project.countDocuments(queryObj);

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
  getById: async (req, res, next) => {
    try {
      const { recordId } = req.body;
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
            from: "projectfloors",
            let: { projectId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$projectId", "$$projectId"],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  floorNo: 1,
                  floorId: 1,
                },
              },
            ],
            as: "floorDetails",
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
                    $eq: ["$projectId", "$$projectId"],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  flatNo: 1,
                  rooms: 1,
                },
              },
            ],
            as: "flatDetails",
          },
        },
      ];
      const project = await Project.aggregate(pipeLine);

      if (!project) {
        return UtilController.sendError(req, res, next, {
          message: "task not found",
          responseCode: returnCode.invalidSession,
        });
      }

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched the task",
        responseCode: returnCode.validSession,
        project,
      });
    } catch (error) {
      UtilController.sendError(req, res, next);
    }
  },
  getRoomDropdown: async (req, res, next) => {
    try {
      const searchKey = req.body.keyword;

      let queryObj = {
        active: true,
      };
      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [{ roomName: { $regex: searchKey, $options: "i" } }];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            roomName: 1,
            roomLogo: 1,
          },
        },
      ];
      const room = await Room.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        message: "rooms listed successfully ",
        responseCode: returnCode.validSession,
        room,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getSupervisorDropdown: async (req, res, next) => {
    try {
      const searchKey = req.body.keyword;

      let queryObj = {
        active: true,
        userType: "supervisor",
      };
      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [{ fullName: { $regex: searchKey, $options: "i" } }];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            fullName: 1,
          },
        },
      ];
      const supervisor = await User.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        message: "supervisor listed successfully ",
        responseCode: returnCode.validSession,
        supervisor,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  getWorkerDropdown: async (req, res, next) => {
    try {
      const searchKey = req.body.keyword;

      let queryObj = {
        active: true,
        userType: "worker",
      };
      if (!UtilController.isEmpty(searchKey)) {
        queryObj["$or"] = [{ fullName: { $regex: searchKey, $options: "i" } }];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $project: {
            fullName: 1,
          },
        },
      ];
      const worker = await User.aggregate(pipeline);
      UtilController.sendSuccess(req, res, next, {
        message: "worker listed successfully ",
        responseCode: returnCode.validSession,
        worker,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
};
