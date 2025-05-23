const responseCode = require("../../../config/responseCode").returnCode;
const mongoose = require("mongoose");
var CryptoJS = require("crypto-js");
var Tag = require("../../model/Tag");
const AWS = require("aws-sdk");
const awsConfig = require("./../../../config/connection");
const AwsController = require("./AwsController");

AWS.config.update({
  secretAccessKey: awsConfig.aws.secretAccessKey,
  accessKeyId: awsConfig.aws.accessKeyId,
  region: awsConfig.aws.region,
});
var link = awsConfig.aws.link;
const Otp = require("../../model/Otp");
module.exports = {
  sendSuccess: async (req, res, next, data) => {
    if (module.exports.isEmpty(data.responseCode)) {
      data["responseCode"] = responseCode.validSession;
    }
    res.status(200).send({
      message: "success",
      code: responseCode.success,
      data: data,
    });
  },
  convertToMongoose: (id) => {
    return new mongoose.Types.ObjectId(id);
  },
  sendError: async (req, res, next, err) => {
    // console.error(err);
    res.status(500).send({
      message: "failure",
      code: responseCode.errror,
      data: err,
    });
  },
  isEmpty: (data) => {
    let returnObj = false;
    if (
      typeof data === "undefined" ||
      data === null ||
      data === "" ||
      data === "" ||
      data.length === 0
    ) {
      returnObj = true;
    }
    return returnObj;
  },
  getOTP: (userObj) => {
    console.log("getOTP");
    let otpVal = 0;
    try {
      // let numberArr = [8948080894,9998887774];
      // let isNumPresent = numberArr.includes(Number(userObj.mobileNo));
      // if (isNumPresent) {
      //   otpVal = "135799";
      // } else {
      // otpVal = Math.floor(Math.random() * (999999 - 100000)) + 100000;
      otpVal = "135799";
      // }
      // otpVal = "135799"; // this is temparoty solution, once integrate sms gateway, need to remove this one
    } catch (err) {
      console.error(err);
    }
    console.log("return otp= " + otpVal);
    return otpVal;
  },
  // getOTP: async (userObj) => {
  //   console.log("userObj: ", userObj);
  //   try {
  //     const payload = {
  //       otp: "136799",
  //       userId: userObj._id,
  //     };
  //     const saveOtp = await Otp.findOneAndUpdate(
  //       { userId: userObj._id },
  //       payload,
  //       { new: true, upsert: true }
  //     );
  //     return saveOtp;
  //   } catch (err) {
  //     console.error(err);
  //   }
  // },
  checkEmailStatus: (userObj) => {
    let userCode = responseCode.accountSuspended; // user account is suspended/ deactivated, needs to check with admin team
    try {
      if (!module.exports.isEmpty(userObj)) {
        if (userObj.active && userCode === responseCode.accountSuspended) {
          userCode = responseCode.validEmail; // success, email id is valid
        }
        if (userObj.passwordAttempt > 2) {
          userCode = responseCode.exceededpasswordAttempt; // success, email id is valid
        }
      } else {
        userCode = responseCode.emailNotFound; // email id is not there, wrong email address, records not found in DB
      }
    } catch (err) {
      console.error(err);
      userCode = responseCode.userException;
    } finally {
      return userCode;
    }
  },
  comparePassword: (passwordHash, userPassword, secretKey) => {
    let returnObj = responseCode.passwordMismatch;
    try {
      // Decrypt
      let bytes = CryptoJS.AES.decrypt(passwordHash, secretKey);
      let decryptedPwd = bytes.toString(CryptoJS.enc.Utf8);
      console.log("decryptedPwd", decryptedPwd);
      if (decryptedPwd === userPassword) {
        returnObj = responseCode.passwordMatched;
      }
    } catch (err) {
      console.error(err);
      returnObj = responseCode.userException;
    } finally {
      return returnObj;
    }
  },
  decryptData: (passwordHash, secretKey) => {
    try {
      let bytes = CryptoJS.AES.decrypt(passwordHash, secretKey);
      let decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.log("error in payload dencryption---", error);
      return null;
    }
  },
  uploadFiles: async function (req, res, next) {
    try {
      const attachmentUrlArray = [];
      const bucket = awsConfig.aws.bucket + "/" + req.body.bucketName;
      const isPrivate = req.body.isPrivate === true;

      if (req.files && req.files.attachment) {
        const attachmentObj = req.files.attachment;
        console.log(attachmentObj);

        if (Array.isArray(attachmentObj)) {
          // Handle multiple files
          const uploadPromises = attachmentObj.map(async (file) => {
            const attachmentName = Date.now() + "_" + file.originalname;
            const attachmentUrl = link.concat(
              bucket + "/" + encodeURIComponent(attachmentName)
            );
            attachmentUrlArray.push(attachmentUrl);
            console.log(attachmentUrl);

            await AwsController.upload2AWS(
              file.path,
              bucket,
              attachmentName,
              file.mimetype
            );
          });

          await Promise.all(uploadPromises);

          if (isPrivate) {
            const data = {
              attachmentName: attachmentObj[0].originalname, // or adjust based on needs
              attachmentUrl: attachmentUrlArray[0],
            };
            module.exports.saveFile(req, res, next, data);
          } else {
            module.exports.sendSuccess(req, res, next, {
              attachmentUrl: attachmentUrlArray,
            });
          }
        } else {
          // Handle single file
          const file = attachmentObj;
          const attachmentName = Date.now() + "_" + file.originalname;
          const attachmentUrl = link.concat(
            bucket + "/" + encodeURIComponent(attachmentName)
          );
          console.log(attachmentUrl);
          attachmentUrlArray.push(attachmentUrl);

          await AwsController.uploadSingleFile(
            file.path,
            bucket,
            attachmentName,
            file.mimetype
          );

          if (isPrivate) {
            const data = {
              attachmentName,
              attachmentUrl: attachmentUrlArray[0],
            };
            module.exports.saveFile(req, res, next, data);
          } else {
            module.exports.sendSuccess(req, res, next, {
              attachmentUrl: attachmentUrlArray,
            });
          }
        }
      } else {
        // Handle the case where no files are provided
        module.exports.sendError(
          req,
          res,
          next,
          new Error("No files uploaded")
        );
      }
    } catch (err) {
      console.error(err);
      module.exports.sendError(req, res, next, err);
    }
  },
  pad: (num, size) => {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  },

  convertToLowercase: async (name) => {
    return name.toLowerCase();
  },

  tagGenerator: async (tagType) => {
    try {
      const tag = await Tag.findOneAndUpdate(
        { active: true, tagType },
        { $inc: { sequenceNo: 1 }, updatedAt: Math.floor(Date.now() / 1000) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      // Ensure sequence number is at least 4 digits long (e.g., 0001)
      const sequenceNo = tag.sequenceNo.toString().padStart(4, "0");
      return { tagType: tag.tagType, sequenceNo };
    } catch (err) {
      return null;
    }
  },
};
