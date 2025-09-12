const responseCode = require("../../../config/responseCode").returnCode;
const mongoose = require("mongoose");
var CryptoJS = require("crypto-js");
var Tag = require("../../model/Tag");
const AWS = require("aws-sdk");
const awsConfig = require("./../../../config/connection");
const AwsController = require("./AwsController");
const fs = require("fs");

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
    console.log("uploadFiles");
    try {
      //var attachmentUrl = "";
      var attachmentUrlArray = [];
      var attachmentName;
      var code = 1;
      console.log(req.body);
      if (
        !(req.files === null || req.files === undefined) &&
        !(req.files.attachment === undefined)
      ) {
        // to get the bucket name based on input condition, starts Here
        var bucket = awsConfig.aws.bucket + "/" + req.body.bucketName;

        // ends here
        var attachmentObj = req.files.attachment;
        if (Array.isArray(attachmentObj)) {
          for (var i = 0; i < attachmentObj.length; i++) {
            attachmentName = Date.now() + "_" + attachmentObj[i].originalname;
            attachmentUrlArray.push(
              link.concat(bucket + "/" + encodeURIComponent(attachmentName))
            );
            await AwsController.upload2AWS(
              attachmentObj[i].path,
              bucket,
              attachmentName,
              attachmentObj[i].mimetype
            ); // this is async call, will not wait until to finish upload
          }
        } else {
          var attachmentPath = attachmentObj.path;
          console.log("attachmentPath: ", attachmentPath);
          console.log("attachmentObj: ", attachmentObj);
          attachmentName = Date.now() + "_" + attachmentObj.originalname;
          //  attachmentUrl = link.concat(bucket + '/' + attachmentName);
          attachmentUrlArray.push(
            link.concat(bucket + "/" + encodeURIComponent(attachmentName))
          );
          await AwsController.upload2AWS(
            attachmentPath,
            bucket,
            attachmentName,
            attachmentObj.mimetype
          ); // this is async call, will not wait until to finish upload
          if (
            !module.exports.isEmpty(req.body.isPrivate) &&
            req.body.isPrivate == "true"
          ) {
            data = {
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

  getStartAndEndOfDay: (currentDate) => {
    if (currentDate < 1e12) {
      // less than 1 trillion = seconds
      currentDate *= 1000;
    }

    // Get the start of the day
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Get the end of the day
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      startOfDay: Math.floor(startOfDay.getTime() / 1000),
      endOfDay: Math.floor(endOfDay.getTime() / 1000),
    };
  },

  convertTOISOFormat: () => {
    const date = new Date();
    const isoDate = date.toISOString().split("T")[0];
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    return { isoDate, dayName };
  },

  convertToDateFormat: (timestampInSeconds) => {
    const date = new Date(timestampInSeconds * 1000);
    const istDate = date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const [day, month, year] = istDate.split("/");
    return `${year}-${month}-${day}`;
  },

  convertToEpoch: (date) => {
    // Convert to Date object
    const dateObj = new Date(date);

    // Convert to milliseconds (epoch) in UTC
    const utcEpoch = dateObj.getTime();

    // Calculate IST offset (5 hours 30 minutes)
    const istOffset = 5.5 * 60 * 60 * 1000; // milliseconds

    // Add offset to get IST epoch
    const istEpoch = utcEpoch + istOffset;

    return Math.floor(istEpoch / 1000);
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

  calculateAttendanceStatus: (durationSeconds) => {
    const nineHours = 9 * 3600;
    if (durationSeconds > nineHours) return "overtime";
    if (durationSeconds === nineHours) return "present";
    if (durationSeconds < nineHours) return "earlyLeave";
    return "inwork";
  },

  calculateAttendanceCheckinStatus: (timestamp) => {
    const nineAM = new Date();
    let convertedTimeStamp = timestamp + ((5 * 60 + 30) * 60 * 1000) / 1000;
    nineAM.setHours(9, 0, 0, 0);
    const nineAMTimestamp = nineAM.getTime() / 1000;

    if (convertedTimeStamp > nineAMTimestamp) return "late";
    if (convertedTimeStamp < nineAMTimestamp) return "early";
    if (convertedTimeStamp === nineAMTimestamp) return "present";
  },
};
