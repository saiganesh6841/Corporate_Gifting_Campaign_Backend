const configuration = require("../../../config/configuration");
const { returnCode } = require("../../../config/responseCode");
const User = require("../../model/User");
const TokenController = require("../services/TokenController");
const UtilController = require("../services/UtilController");
const NodeCache = require("node-cache");

const systemCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: configuration.login.otpValidation,
});

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
        systemCache.set(
          req.sessionID,
          user._id,
          configuration.login.otpValidation
        ); // 10 minute time
        req.session.userType = user.userType;
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
      // console.log("sessionOtp", req.session.otpVal);

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
      let isPasswordChange = req.body.isPasswordChange ?? false;
      let userResult;

      if (Number(req.body.otpVal) === Number(req.session.otpVal)) {
        response = returnCode.validSession;
        let userSes = systemCache.get(req.sessionID);

        if (!(typeof userSes === "undefined" || userSes === null)) {
          req.session.userId = userSes;
          userResult = await User.findByIdAndUpdate(userSes, {
            lastLogin: Math.floor(Date.now() / 1000),
            passwordAttempt: 0,
            isPasswordChange: isPasswordChange,
          })
            .select(" userType email fname lname mobileNo _id")
            .lean();

          const token = await TokenController.createToken(userResult._id);
          console.log("token: ", token);

          const isProduction = process.env.NODE_ENV === "production";

          res.cookie("adminToken", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000,
          });

          req.session.userType = userResult.userType;
          systemCache.del(req.sessionID);
        } else {
          response = returnCode.invalidToken;
          return UtilController.sendError(req, res, next, {
            responseCode: response,
            message: "invalid session",
          });
        }
      }

      UtilController.sendSuccess(req, res, next, {
        responseCode: response,
        user: userResult,
        message: "otp verified successfully",
      });
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};
