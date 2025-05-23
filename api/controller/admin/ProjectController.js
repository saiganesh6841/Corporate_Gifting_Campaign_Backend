const Project = require("../../model/Project");
const Room = require("../../model/Room");
const Tag = require("../../model/Tag");
const { returnCode } = require("../../../config/responseCode");
const UtilController = require("../services/UtilController");

module.exports = {
  createProject: async (req, res, next) => {
    try {
      const { mobileNumber, email, ...createObj } = req.body;
      console.log("createObj: ", createObj);

      const { userId } = req.user;

      if (!userId) {
        return UtilController.sendError(req, res, next, {
          message: "User not found",
          responseCode: returnCode.invalidSession,
        });
      }

      const tagResult = await Tag.findOneAndUpdate(
        {
          tagType: "project",
          active: true,
        },
        {
          $inc: { sequenceNo: 1 },
          updatedAt: Math.floor(Date.now() / 1000),
        }
      );
      createObj["projectId"] =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

      // const projectResult = await Project.create({
      //   ...createObj,
      //   clientPhoneNo: mobileNumber,
      //   clientEmail: email,
      //   createdBy: userId,
      // });

      console.log("projectResult: ", projectResult._id);

      return UtilController.sendSuccess(req, res, next, {
        message: "Project created successfully",
        responseCode: returnCode.validSession,
        projectResult,
      });
    } catch (error) {
      console.log("error: ", error);
      UtilController.sendError(req, res, next, {
        message: "Something went wrong",
        responseCode: returnCode.internalServerError,
      });
    }
  },
};
