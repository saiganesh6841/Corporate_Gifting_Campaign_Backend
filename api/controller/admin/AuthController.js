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
        await User.findOneAndUpdate(
          { active: true, email },
          { $set: { otpExpiresAt: Math.floor(Date.now() / 1000) + 60 } }
        );
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

      const userSes = systemCache.get(req.sessionID);
      let user = null;

      if (!(typeof userSes === "undefined" || userSes === null)) {
        user = await User.findById(userSes).lean();

        // Check if user exists and OTP is still valid
        if (
          !user ||
          !user.otpExpiresAt ||
          user.otpExpiresAt < Math.floor(Date.now() / 1000)
        ) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.invalidToken,
            message: "OTP has expired",
          });
        }

        // Verify OTP value
        if (Number(req.body.otpVal) === Number(req.session.otpVal)) {
          response = returnCode.validSession;

          req.session.userId = userSes;
          userResult = await User.findByIdAndUpdate(
            userSes,
            {
              lastLogin: Math.floor(Date.now() / 1000),
              passwordAttempt: 0,
              isPasswordChange: isPasswordChange,
            },
            { new: true }
          )
            .select("userType email fname lname mobileNo _id")
            .lean();

          const token = await TokenController.createToken(userResult._id);
          console.log("token: ", token);

          const isProduction = process.env.NODE_ENV === "production";

          res.cookie("adminToken", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          });

          req.session.userType = userResult.userType;
          systemCache.del(req.sessionID);

          return UtilController.sendSuccess(req, res, next, {
            responseCode: response,
            user: userResult,
            message: "OTP verified successfully",
          });
        } else {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.invalidToken,
            message: "Invalid OTP",
          });
        }
      } else {
        return UtilController.sendError(req, res, next, {
          responseCode: returnCode.invalidToken,
          message: "Invalid session",
        });
      }
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  resendOtp: async (req, res, next) => {
    try {
      const userSes = systemCache.get(req.sessionID);
      let response = returnCode.validSession;

      if (!(typeof userSes === "undefined" || userSes === null)) {
        const userObj = await User.findById(userSes).select(
          "fullName active email mobileNumber"
        );

        if (!userObj || !userObj.active) {
          return UtilController.sendError(req, res, next, {
            responseCode: returnCode.invalidToken,
            message: "User not found or inactive",
          });
        }

        await module.exports.sendOtp(req, userObj);

        await User.findByIdAndUpdate(userSes, {
          $set: {
            otpExpiresAt: Math.floor(Date.now() / 1000) + 60,
          },
        });

        return UtilController.sendSuccess(req, res, next, {
          responseCode: response,
          message: "OTP resent successfully",
        });
      } else {
        response = returnCode.invalidToken;
        return UtilController.sendError(req, res, next, {
          responseCode: response,
          message: "Invalid session",
        });
      }
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },

  accountLoginStatus: async function (req, res, next) {
    try {
      let responseCode = returnCode.invalidSession;
      let user, receiverId;
      if (!UtilController.isEmpty(req.session.userId)) {
        responseCode = returnCode.validSession;
        receiverId = req.session.userId;

        user = await User.findById(req.session.userId)
          .select(
            "fullName email mobileNumber  profileImage userType permission dob isPasswordChange"
          )
          .populate("permission")
          .lean();
      }

      UtilController.sendSuccess(req, res, next, {
        responseCode,
        user,
      });
    } catch (err) {
      UtilController.sendError(req, res, next, err);
    }
  },
  logout: async (req, res, next) => {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.log("Session destruction error:", err);
            return UtilController.sendError(req, res, next, err);
          }

          res.clearCookie("connect.sid", {
            path: "/",
            httpOnly: true,
            secure: false,
          });
          res.clearCookie("adminToken");

          UtilController.sendSuccess(req, res, next, {
            responseCode: returnCode.validSession,
            message: "logout successfully",
          });
        });
      } else {
        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          secure: false,
        });
        res.clearCookie("adminToken");

        UtilController.sendSuccess(req, res, next, {
          responseCode: returnCode.validSession,
          message: "logout successfully",
        });
      }
    } catch (err) {
      console.log("err: ", err);
      UtilController.sendError(req, res, next, err);
    }
  },
};
