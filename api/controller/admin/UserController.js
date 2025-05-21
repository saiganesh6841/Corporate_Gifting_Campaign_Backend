const User = require("../../model/User");
const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");
const Tag = require("../../model/Tag");
module.exports = {
  createUser: async (req, res, next) => {
    let createObj = req.body;

    if (
      UtilController.isEmpty(createObj?.fullName) ||
      UtilController.isEmpty(createObj?.email) ||
      UtilController.isEmpty(createObj?.mobileNumber)
    ) {
      return UtilController.sendSuccess(req, res, next, {
        message:
          "Name, email and mobile number is required for creating the account",
        responseCode: returnCode.invalidInput,
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: createObj.email },
        { mobileNumber: createObj.mobileNumber },
      ],
      active: true,
    });

    if (existingUser) {
      return UtilController.sendSuccess(req, res, next, {
        message: "email or mobile number already exists",
        responseCode: returnCode.duplicate,
      });
    } else {
      const tagResult = await Tag.findOneAndUpdate(
        {
          tagType: "user",
          active: true,
        },
        {
          $inc: { sequenceNo: 1 },
          updatedAt: Math.floor(Date.now() / 1000),
        }
      );
      createObj["userId"] =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

      const userResult = await User.create(createObj);
      return UtilController.sendSuccess(req, res, next, {
        message: "succesfully created new user",
        responseCode: returnCode.validSession,
        user: userResult,
      });
    }
  },

  queryAllWorkers : async (req, res, next) => {

  }
};
