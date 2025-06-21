const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");
const Room = require("../../model/Room");
const Tag = require("../../model/Tag");
module.exports = {
  createRoom: async (req, res, next) => {
    try {
      const { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { roomName, color, roomLogo } = req.body;

      const isRoomExists = await Room.findOne({
        roomName: { $regex: `^${roomName}$`, $options: "i" },
      });

      if (isRoomExists) {
        return UtilController.sendError(req, res, next, {
          message: "Room already exists",
          responseCode: returnCode.duplicate,
        });
      }

      const tagResult = await Tag.findOneAndUpdate(
        {
          tagType: "room",
          active: true,
        },
        {
          $inc: { sequenceNo: 1 },
          updatedAt: Math.floor(Date.now() / 1000),
        }
      );

      const roomId =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

      const createRoomObj = {
        roomId,
        roomName,
        color,
        roomLogo,
        createdBy: userId,
      };

      const roomResult = await Room.create(createRoomObj);

      return UtilController.sendSuccess(req, res, next, {
        message: "Room created successfully",
        responseCode: returnCode.validSession,
        roomResult,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, err);
    }
  },

  updateRoom: async (req, res, next) => {
    const { userId } = req.user;
    if (!userId) {
      return UtilController.sendError(req, res, next, {
        message: "User not found",
        responsCode: returnCode.invalidSession,
      });
    }

    const { recordId } = req.body;

    const isRoomExists = await Room.findById(recordId);

    if (!isRoomExists) {
      return UtilController.sendError(req, res, next, {
        message: "Room not found",
        responseCode: returnCode.invalidSession,
      });
    }
    if (isRoomExists._id.toString() !== recordId) {
      return UtilController.sendError(req, res, next, {
        message: "Room name already exists",
        responseCode: returnCode.duplicate,
      });
    }
    const updatedRoom = await Room.findByIdAndUpdate(
      recordId,
      {
        ...req.body,
        updatedBy: userId,
        updatedAt: Math.floor(Date.now() / 1000),
      },
      { new: true }
    );
    return UtilController.sendSuccess(req, res, next, {
      message: "successfully updated room",
      responseCode: returnCode.validSession,
      roomResult: updatedRoom,
    });
  },

  deleteRoom: async (req, res, next) => {
    try {
      const { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const { roomIds } = req.body;

      if (!Array.isArray(roomIds) || roomIds.length === 0) {
        return UtilController.sendSuccess(req, res, next, {
          message: "roomIds array is required",
          responseCode: returnCode.invalidInput,
        });
      }

      await Room.updateMany(
        { _id: { $in: roomIds } },
        { $set: { active: false } }
      );

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully deleted the rooms",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      return UtilController.sendError(req, res, error);
    }
  },

  getAllRoom: async (req, res, next) => {
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
        updatedAt: -1,
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
          $lookup: {
            from: "users",
            localField: "updatedBy",
            foreignField: "_id",
            as: "updatedByUser",
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
            updatedBy: {
              $arrayElemAt: ["$updatedByUser.fullName", 0],
            },
          },
        },
        ...(searchKey
          ? [
              {
                $match: {
                  $or: [
                    { roomId: { $regex: searchKey, $options: "i" } },
                    { roomName: { $regex: searchKey, $options: "i" } },
                    { createdBy: { $regex: searchKey, $options: "i" } },
                    { updatedBy: { $regex: searchKey, $options: "i" } },
                  ],
                },
              },
            ]
          : []),
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
  getRoomById: async (req, res, next) => {
    try {
      const { userId } = req.user;
      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responsCode: returnCode.invalidSession,
        });
      }

      const { recordId } = req.body;

      const room = await Room.findById(recordId);

      if (!room) {
        return UtilController.sendError(req, res, next, {
          message: "Room not found",
          responseCode: returnCode.invalidSession,
        });
      }

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully fetched the room",
        responseCode: returnCode.validSession,
        room,
      });
    } catch (error) {
      UtilController.sendError(req, res, next, error);
    }
  },
};
