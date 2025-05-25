const Project = require("../../model/Project");
const Room = require("../../model/Room");
const Tag = require("../../model/Tag");
const { returnCode } = require("../../../config/responseCode");
const UtilController = require("../services/UtilController");
const mongoose = require("mongoose");
const ProjectFlats = require("../../model/ProjectFlats");
const ProjectFloors = require("../../model/ProjectFloors");

module.exports = {
  createProject: async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { mobileNumber, email, details = [], ...projectData } = req.body;

      const { userId } = req.user;

      if (!userId) {
        await session.abortTransaction();
        session.endSession();
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
        },
        { session, new: true }
      );
      projectData["projectId"] =
        tagResult.prefix + UtilController.pad(tagResult.sequenceNo, 5);

      const project = await Project.create(
        [
          {
            ...projectData,
            clientPhoneNo: mobileNumber,
            clientEmail: email,
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          },
        ],
        { session }
      );

      const projectDoc = project[0];

      for (const floor of details) {
        const floorTagResult = await Tag.findOneAndUpdate(
          {
            tagType: "floor",
            active: true,
          },
          {
            $inc: { sequenceNo: 1 },
            updatedAt: Math.floor(Date.now() / 1000),
          },
          { session, new: true }
        );
        const floorsId =
          floorTagResult.prefix +
          UtilController.pad(floorTagResult.sequenceNo, 5);

        const floorDoc = await ProjectFloors.create(
          [
            {
              floorId: floorsId,
              floorNo: floor.floorNo,
              projectId: projectDoc._id,
              createdBy: userId,
              createdAt: Math.floor(Date.now() / 1000),
              updatedAt: Math.floor(Date.now() / 1000),
            },
          ],
          { session }
        );

        const floorRef = floorDoc[0];

        // const flatTagResult = await Tag.findOneAndUpdate(
        //   {
        //     tagType: "flat",
        //     active: true,
        //   },
        //   {
        //     $inc: { sequenceNo: 1 },
        //     updatedAt: Math.floor(Date.now() / 1000),
        //   },
        //   { session, new: true }
        // );
        // const flatsId =
        //   flatTagResult.prefix +
        //   UtilController.pad(flatTagResult.sequenceNo, 5);

        for (const flat of floor.roomDetails) {
          const flatObj = {
            // flatId: flatsId,
            flatNo: flat.flatNo,
            floorId: floorRef._id,
            projectId: projectDoc._id,
            createdBy: userId,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
            rooms: flat.rooms.map((roomId) => ({
              roomId: UtilController.convertToMongoose(roomId),
              roomImages: [],
            })),
          };

          await ProjectFlats.create([flatObj], { session });
        }
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return UtilController.sendSuccess(req, res, next, {
        message: "Project created successfully",
        responseCode: returnCode.validSession,
      });
    } catch (error) {
      console.log("error: ", error);
      await session.abortTransaction();
      session.endSession();
      return UtilController.sendError(req, res, next, {
        message: "Something went wrong",
        responseCode: returnCode.internalServerError,
      });
    }
  },
};
