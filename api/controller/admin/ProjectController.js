const Project = require("../../model/Project");
const Room = require("../../model/Room");
const Tag = require("../../model/Tag");
const { returnCode } = require("../../../config/responseCode");
const UtilController = require("../services/UtilController");

module.exports = {
  createProject: async (req, res, next) => {
    const createObj = req?.body;

    let alreadyExistingProject = await Project.findOne({
      active: true,
      projectName: createObj?.projectName,
    });

    if (alreadyExistingProject) {
      return UtilController.sendSuccess(req, res, next, {
        message: "Project already exists",
        responseCode: returnCode.duplicate,
      });
    } else {
      const createdRooms = await Room.insertMany(createObj?.rooms);
      const roomIds = createdRooms?.map((room) => room._id);

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
      const newProject = await Project.create({ ...createObj, rooms: roomIds });

      return UtilController.sendSuccess(req, res, next, {
        message: "Project created successfully",
        responseCode: returnCode.validSession,
        projectDetails: newProject,
      });
    }
  },
};
