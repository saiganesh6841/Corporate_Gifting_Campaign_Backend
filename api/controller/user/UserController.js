const { returnCode } = require("../../../config/responseCode");
const User = require("../../model/User");
const Otp = require("../../model/Otp");
const UtilController = require("../services/UtilController");
const { createToken } = require("../services/TokenController");

module.exports = {
  login: async (req, res, next) => {
    const { mobileNumber } = req.body;

    const isUserExist = await User.findOne({ mobileNumber });

    if (!isUserExist) {
      return UtilController.sendError(req, res, next, {
        message: "Cannot find a user with this number",
        responseCode: returnCode.recordNotFound,
      });
    }

    if (isUserExist?.userType !== "worker") {
      return UtilController.sendError(req, res, next, {
        message: "You don't have the access",
        responseCode: returnCode.invalidSession,
      });
    }

    {
      const otp = UtilController.getOTP();
      otpObject = {
        otp,
        userId: isUserExist?._id,
      };
      const otpResult = await Otp.create(otpObject);

      return UtilController.sendSuccess(req, res, next, {
        message: "Successfully send OTP to the registered mobile number",
        responseCode: returnCode.validSession,
        otpId: otpResult?._id,
      });
    }
  },

  verifyOtp: async (req, res, next) => {
    const { otpId, otp } = req?.body;
    const isOtpExist = await Otp.findById(otpId);
    const user = await User.findById(isOtpExist?.userId);

    if (otpId === isOtpExist._id.toString()) {
      if (otp === isOtpExist?.otp) {
        const token = await createToken(user?._id);
        await Otp.findByIdAndDelete(otpId);

        return UtilController.sendSuccess(req, res, next, {
          message: "OTP verified succesfully",
          responseCode: returnCode.validSession,
          user,
          token,
        });
      } else {
        return UtilController.sendError(req, res, next, {
          message: "Incorrect OTP",
          responseCode: returnCode.passwordMismatch,
        });
      }
    } else {
      return UtilController.sendError(req, res, next, {
        message: "Incorrect Otp",
        responseCode: returnCode.passwordMismatch,
      });
    }
  },

  userProfile: async (req, res, next) => {
    const userId = req?.user?.userId;
    if (!userId) {
      return UtilController.sendError(req, res, next, {
        message: "User doesn't exist",
        responseCode: returnCode.recordNotFound,
      });
    }

    const user = await User.findById(userId);

    return UtilController.sendSuccess(req, res, next, {
      message: "successfully fetched user details",
      responseCode: returnCode.validSession,
      userDetails: user,
    });
  },

  uploadFiles: async (req, res, next) => {
    try {
      UtilController.uploadFiles(req, res, next);
    } catch (err) {
      console.log("uploadFiles -catch");
      console.log(err);
      UtilController.sendError(req, res, next, err);
    }
  },

  logout: async (req, res, next) => {
    try {
      req.user = {};
      UtilController.sendSuccess(req, res, next, {
        message: "user account is logout successfully",
      });
    } catch (err) {
      console.error(err);
      UtilController.sendError(req, res, next, err);
    }
  },
};
