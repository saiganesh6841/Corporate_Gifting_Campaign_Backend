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

    const { recordId, roomName } = req.body;

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
    const { userId } = req.user;
    if (!userId) {
      return UtilController.sendError(req, res, next, {
        message: "User not found",
        responsCode: returnCode.invalidSession,
      });
    }

    const rooms = await Room.find({ active: true });

    return UtilController.sendSuccess(req, res, next, {
      message: "Successfully fetched all rooms",
      responseCode: returnCode.validSession,
      rooms,
    });
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
      utilController.sendError(req, res, next, error);
    }
  },
};
