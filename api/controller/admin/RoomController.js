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

      const lowerCaseRoomName = await UtilController.convertToLowercase(
        roomName
      );

      const isRoomExists = await Room.findOne({ roomName: lowerCaseRoomName });

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
        roomName: lowerCaseRoomName,
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

    const { roomId, roomName } = req.body;
    const lowerCaseRoomName = await UtilController.convertToLowercase(roomName);

    const isRoomExists = await Room.findById(roomId);
    
    if (!isRoomExists) {
      return UtilController.sendError(req, res, next, {
        message: "Room not found",
        responseCode: returnCode.invalidSession,
      });
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      {
        $set: {
          roomName: lowerCaseRoomName,
          ...req.body,
        },
      },
      { new: true }
    );

    return UtilController.sendSuccess(req, res, next, {
      message: "successfully updated room",
      responseCode: returnCode.validSession,
      roomResult: updatedRoom,
    });
  },
};
