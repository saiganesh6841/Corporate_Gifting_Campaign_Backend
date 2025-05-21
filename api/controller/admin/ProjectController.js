const Project = require("../../model/Project");
const Room = require("../../model/Room");
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

      const newProject = await Project.create({ ...createObj, rooms: roomIds });

      return UtilController.sendSuccess(req, res, next, {
        message: "Project created successfully",
        responseCode: returnCode.validSession,
        projectDetails: newProject,
      });
    }
  },
};
