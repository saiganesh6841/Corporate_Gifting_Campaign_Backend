const User = require("../../model/User");
const UtilController = require("../services/UtilController");
const { returnCode } = require("../../../config/responseCode");
const Tag = require("../../model/Tag");
const Role = require("../../model/Role");
var CryptoJS = require("crypto-js");

module.exports = {
  createUser: async (req, res, next) => {
    try {
      let createObj = req.body;
      const permissionId = createObj?.permissionId;

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
        // createObj["createdBy"] = req.user?.userId;

        if (!UtilController.isEmpty(createObj?.password)) {
          const password = createObj.password;
          const encryptedPassword = CryptoJS.AES.encrypt(
            password,
            process.env.ENCRYPTION_KEY
          ).toString();
          createObj["password"] = encryptedPassword;
        }

        if (!UtilController.isEmpty(permissionId)) {
          let role = await Role.findOne({
            name: UtilController.convertToMongoose(permissionId),
          });
          if (!UtilController.isEmpty(role)) {
            createObj["permission"] = role._id;
          }
        } else {
          createObj["permission"] = null;
        }

        const userResult = await User.create(createObj);
        return UtilController.sendSuccess(req, res, next, {
          message: "succesfully created new user",
          responseCode: returnCode.validSession,
          user: userResult,
        });
      }
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, error);
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

  queryAllWorkers: async (req, res, next) => {},
};
