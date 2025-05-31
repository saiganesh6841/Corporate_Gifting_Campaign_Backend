const { returnCode } = require("../../../config/responseCode");
const Project = require("../../model/Project");
const Schedule = require("../../model/Schedule");
const Tag = require("../../model/Tag");
const UtilController = require("../services/UtilController");
const mongoose = require("mongoose");
const {
  format,
  isToday,
  differenceInMinutes,
  fromUnixTime,
  startOfDay,
  endOfDay,
} = require("date-fns");

module.exports = {
  createTiming: async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId } = req.user;

      if (!userId) {
        await session.abortTransaction();
        session.endSession();
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { projectId, checkIn, checkOut } = req.body;

      // Validate inputs
      if (!projectId || !checkIn || !checkOut) {
        await session.abortTransaction();
        session.endSession();
        return UtilController.sendError(req, res, next, {
          message: "Missing required fields: projectId, checkIn, or checkOut",
          responsCode: returnCode.invalidSession,
        });
      }

      const project = await Project.findById(projectId).session(session);

      if (!project) {
        await session.abortTransaction();
        session.endSession();
        return UtilController.sendError(req, res, next, {
          message: "Project not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const tagResult = await Tag.findOneAndUpdate(
        { tagType: "schedule", active: true },
        {
          $inc: { sequenceNo: 1 },
          updatedAt: Math.floor(Date.now() / 1000),
        },
        {
          new: true,
          session,
        }
      );

      const scheduleId =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

      const durationInSeconds = checkOut - checkIn;
      const hours = Math.floor(durationInSeconds / 3600);
      const minutes = Math.floor((durationInSeconds % 3600) / 60);
      const totalHoursFormatted = `${hours}h ${minutes}m`;

      const createScheduleObj = {
        scheduleId,
        projectId: project._id,
        checkIn,
        checkOut,
        totalHours: totalHoursFormatted,
        createdBy: userId,
      };

      const scheduleResult = await Schedule.create([createScheduleObj], {
        session,
      });

      await session.commitTransaction();
      session.endSession();

      return UtilController.sendSuccess(req, res, next, {
        message: "Schedule timing created successfully",
        responseCode: returnCode.validSession,
        scheduleResult: scheduleResult[0],
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.log("error: ", error);
      return UtilController.sendError(req, res, next, error);
    }
  },

  listTiming: async (req, res, next) => {
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
          { roomId: { $regex: searchKey, $options: "i" } },
          { roomName: { $regex: searchKey, $options: "i" } },
        ];
      }
      const pipeline = [
        {
          $match: queryObj,
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdByUser",
          },
        },
        {
          $project: {
            roomId: 1,
            roomName: 1,
            roomLogo: 1,
            color: 1,
            createdAt: 1,
            updatedAt: 1,
            active: 1,
            createdBy: {
              $arrayElemAt: ["$createdByUser.fullName", 0],
            },
          },
        },
        { $sort: sortOrder },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const result = await Room.aggregate(pipeline);
      let pageCount = await Room.countDocuments(queryObj);

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
  getTimingById: async (req, res, next) => {
    try {
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  updateTiming: async (req, res, next) => {
    try {
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
  deleteTiming: async (req, res, next) => {
    try {
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
};
