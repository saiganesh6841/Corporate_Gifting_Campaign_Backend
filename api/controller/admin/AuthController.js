const { returnCode } = require("../../../config/responseCode");
const User = require("../../model/User");
const UtilController = require("../services/UtilController");

module.exports = {
  accountLogin: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      let userCode = returnCode.validEmail;
      let user;

      if (UtilController.isEmpty(email)) {
        return UtilController.sendSuccess(req, res, next, {
          responseCode: returnCode.invalidInput,
          message: "email is  required",
        });
      }

      if (UtilController.isEmpty(password)) {
        return UtilController.sendSuccess(req, res, next, {
          responseCode: returnCode.invalidInput,
          message: "Password is required for email login",
        });
      }

      user = await User.findOne({ email: email, active: true }).lean();
      userCode = UtilController.checkEmailStatus(user);

      if (userCode !== returnCode.validEmail) {
        return UtilController.sendSuccess(req, res, next, {
          responseCode: userCode,
          message: "User not found or account is inactive",
        });
      }

      userCode = UtilController.comparePassword(
        user.password,
        password,
        process.env.passwordSecretKey
      );
      if (userCode === returnCode.passwordMatched) {
        await module.exports.sendOtp(req, user);
      } else {
        //update password attempt
        await User.findOneAndUpdate(
          { active: true, email },
          { $inc: { passwordAttempt: 1 } }
        );
        return UtilController.sendSuccess(req, res, next, {
          responseCode: userCode,
        });
      }

      UtilController.sendSuccess(req, res, next, {
        responseCode: userCode,
        message: "otp send successfully",
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
  sendOtp: async (req, userObj) => {
    try {
      let otpVal = UtilController.getOTP(userObj);
      console.log("otp", otpVal);

      req.session.otpVal = otpVal;
      console.log("sessionOtp", req.session.otpVal);

      //   NotificationController.sendUserOtp({
      //     mobileNo: userObj.mobileNo,
      //     email: userObj.email,
      //     otp: otpVal,
      //     data: {
      //       otp: otpVal,
      //       userName: userObj.fname,
      //     },
      //   });
    } catch (err) {
      console.error(err);
    }
  },
  verifyOtp: async (req, res, next) => {
    try {
      let response = returnCode.invalidToken;
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};
